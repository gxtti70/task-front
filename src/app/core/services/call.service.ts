import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, finalize, firstValueFrom, switchMap, tap, throwError } from 'rxjs';
import { CallEndReason, CallEvent, CallSignalType, CallSnapshot } from '../models';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

/** Cursor con el que cada cliente empieza a leer los eventos de una llamada. */
const INITIAL_CURSOR = 0;
/** Cadena de señalización: sondeo de eventos mientras hay llamada. */
const EVENTS_POLL_INTERVAL_MS = 1000;
/** Descubrimiento de llamadas entrantes (la vista sondea con esta frecuencia). */
const ACTIVE_POLL_INTERVAL_MS = 3000;
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

const END_MESSAGES: Record<CallEndReason, string> = {
  DECLINED: 'La persona ha rechazado la llamada.',
  CANCELLED: 'La otra persona ha colgado antes de contestar.',
  MISSED: 'La llamada no se ha contestado.',
  FINISHED: 'La llamada ha finalizado.'
};

/**
 * Videollamadas WebRTC entre dos usuarios de un DM.
 *
 * <p>El audio y el vídeo viajan P2P: aquí solo se intercambia la señalización
 * (SDP y candidatos ICE) por HTTP con el patrón de sondeo del resto de la app.
 * El cliente conserva su propio último `seq` por llamada, **iniciado en 0** al
 * descubrirla, y sondea `GET /api/calls/{id}/events?after=<seq>`.
 *
 * <p>Un 404 en los eventos significa que la sesión ya no existe (reinicio del
 * backend o llamada purgada): se cuelga localmente.
 */
@Injectable({ providedIn: 'root' })
export class CallService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.apiUrl}/calls`;

  /** Frecuencia con la que la vista descubre llamadas entrantes. */
  readonly activePollIntervalMs = ACTIVE_POLL_INTERVAL_MS;

  /** Llamada en curso (sonando o activa) para este usuario. */
  readonly call = signal<CallSnapshot | null>(null);
  readonly localStream = signal<MediaStream | null>(null);
  readonly remoteStream = signal<MediaStream | null>(null);
  readonly micEnabled = signal(true);
  readonly camEnabled = signal(true);
  /** Verdadero mientras se pide permiso de cámara/micrófono y se crea la sesión. */
  readonly starting = signal(false);
  /**
   * Verdadero cuando la llamada es de vídeo. Se deriva del SDP (`m=video`), que
   * es la fuente de verdad de la negociación y la ven ambos extremos por igual.
   */
  readonly videoCall = signal(false);
  /** Nº de pistas de vídeo recibidas del otro extremo (0 en llamada de voz). */
  readonly remoteVideoTracks = signal(0);

  private readonly myId = computed(() => this.auth.currentUser()?.id ?? '');
  readonly isCaller = computed(() => {
    const call = this.call();
    return !!call && call.callerId === this.myId();
  });
  readonly isCallee = computed(() => {
    const call = this.call();
    return !!call && call.calleeId === this.myId();
  });
  /** Hay pista de vídeo local (cámara disponible en esta sesión). */
  readonly hasLocalVideo = computed(() => (this.localStream()?.getVideoTracks().length ?? 0) > 0);
  /** El otro extremo está enviando vídeo (no confundir con su audio). */
  readonly hasRemoteVideo = computed(() => this.remoteVideoTracks() > 0);

  private peer: RTCPeerConnection | null = null;
  private lastSeq = INITIAL_CURSOR;
  private eventsTimer: ReturnType<typeof setInterval> | null = null;
  /** Llamadas ya gestionadas (rechazadas/colgadas): no vuelven a mostrarse. */
  private readonly handledIds = new Set<string>();
  private pendingOffer: string | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];
  private answerSent = false;
  /** Ids de las pistas remotas ya recibidas (el MediaStream se reutiliza). */
  private readonly remoteTrackIds = new Set<string>();
  /** Serializa el procesamiento asíncrono de los eventos (SDP/ICE). */
  private eventChain: Promise<void> = Promise.resolve();

  /**
   * Inicia una llamada en un DM. Con `withVideo` pide cámara y micrófono (si
   * falla la cámara, sigue con solo audio); sin él, solo micrófono: nunca se
   * llega a pedir permiso de cámara. Si el permiso falla, no se llega a crear
   * la sesión en el backend. Con la instantánea creada, se genera y envía la
   * oferta SDP.
   */
  startCall(channelId: string, withVideo: boolean): Observable<CallSnapshot> {
    if (this.call()) return throwError(() => new Error('Ya hay una llamada en curso.'));
    this.starting.set(true);
    return defer(() => this.openLocalMedia(withVideo)).pipe(
      switchMap(() => this.http.post<CallSnapshot>(this.url, { channelId })),
      tap(snapshot => {
        this.beginAsCaller(snapshot);
        // El SDP de la oferta lo confirma o corrige (si no hubo cámara).
        this.videoCall.set(withVideo);
      }),
      finalize(() => this.starting.set(false))
    );
  }

  /** Acepta la llamada entrante: prepara WebRTC y responde al backend. */
  acceptCall(): Observable<CallSnapshot> {
    const call = this.call();
    if (!call || !this.isCallee()) return throwError(() => new Error('No hay ninguna llamada entrante.'));
    if (this.starting()) return throwError(() => new Error('La llamada ya se está aceptando.'));
    this.starting.set(true);
    return defer(() => this.prepareAnswer()).pipe(
      switchMap(() => this.http.post<CallSnapshot>(`${this.url}/${call.id}/answer`, null)),
      tap(session => this.call.set(session)),
      finalize(() => this.starting.set(false))
    );
  }

  /** Rechaza la llamada entrante. */
  declineCall(): void {
    const call = this.call();
    if (!call) return;
    this.http.post<CallSnapshot>(`${this.url}/${call.id}/decline`, null).subscribe({
      next: () => this.teardown('DECLINED', true),
      error: () => this.teardown('DECLINED', true)
    });
  }

  /** Cuelga desde cualquiera de los dos lados (idempotente en el backend). */
  hangUp(): void {
    const call = this.call();
    if (!call) return;
    this.http.post<CallSnapshot>(`${this.url}/${call.id}/end`, null).subscribe({
      next: () => this.teardown('FINISHED', true),
      error: () => this.teardown('FINISHED', true)
    });
  }

  /** Silencia o reactiva el micrófono local. */
  toggleMic(): void {
    const track = this.localStream()?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    this.micEnabled.set(track.enabled);
  }

  /** Activa o desactiva la cámara local. */
  toggleCam(): void {
    const track = this.localStream()?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    this.camEnabled.set(track.enabled);
  }

  /**
   * Descubre llamadas entrantes (`GET /api/calls/active`). Solo se adopta una
   * llamada en RINGING de la que soy la persona llamada; una llamada activa
   * sin sesión local (otra pestaña) se ignora para no pisarla.
   */
  refreshActive(): void {
    if (!this.auth.isAuthenticated()) return;
    this.http.get<CallSnapshot[]>(`${this.url}/active`).subscribe({
      next: list => {
        if (this.call()) return;
        const incoming = list.find(item => item.state === 'RINGING'
          && item.calleeId === this.myId() && !this.handledIds.has(item.id));
        if (incoming) this.beginSession(incoming);
      },
      error: () => { /* fallos transitorios: el siguiente sondeo reintenta */ }
    });
  }

  /** Sondeo de eventos posteriores al cursor propio. */
  pollEvents(): void {
    const call = this.call();
    if (!call) return;
    this.http.get<CallEvent[]>(`${this.url}/${call.id}/events`, { params: { after: this.lastSeq } }).subscribe({
      next: events => {
        if (this.call()?.id !== call.id) return;
        for (const event of events) {
          this.lastSeq = Math.max(this.lastSeq, event.seq);
          this.enqueue(event);
        }
      },
      error: error => {
        const status = (error as { status?: number } | null)?.status;
        // 404: la sesión ya no existe; 401/403: sin acceso. En ambos, se cuelga.
        if (status === 404) this.teardown('FINISHED', false);
        else if (status === 401 || status === 403) this.teardown(null, true);
      }
    });
  }

  /** Detiene el sondeo de eventos sin tocar el estado (lo usan las pruebas). */
  stopPolling(): void {
    if (this.eventsTimer) clearInterval(this.eventsTimer);
    this.eventsTimer = null;
  }

  private beginAsCaller(snapshot: CallSnapshot): void {
    this.beginSession(snapshot);
    this.createPeer();
    this.addLocalTracks();
    // Entornos sin WebRTC (pruebas) no crean peer: no se intenta colgar.
    if (!this.peer && this.localStream()) {
      this.toast.error('Tu navegador no soporta videollamadas.');
      this.hangUp();
      return;
    }
    void this.sendOffer();
  }

  /** Adopta una instantánea y empieza a sondear sus eventos desde el cursor 0. */
  private beginSession(snapshot: CallSnapshot): void {
    this.call.set(snapshot);
    this.lastSeq = INITIAL_CURSOR;
    this.pendingOffer = null;
    this.pendingIce = [];
    this.answerSent = false;
    this.videoCall.set(false);
    this.remoteTrackIds.clear();
    this.remoteVideoTracks.set(0);
    this.eventChain = Promise.resolve();
    if (this.eventsTimer) clearInterval(this.eventsTimer);
    this.eventsTimer = setInterval(() => this.pollEvents(), EVENTS_POLL_INTERVAL_MS);
  }

  private createPeer(): void {
    if (this.peer || typeof RTCPeerConnection === 'undefined') return;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = event => {
      if (!event.candidate) return;
      // Observable perezoso: hay que suscribirse para que la petición salga.
      this.sendSignal('ICE', JSON.stringify(event.candidate.toJSON()))
        .subscribe({ error: () => { /* fallo transitorio: el siguiente candidato reintenta */ } });
    };
    pc.ontrack = event => {
      // El mismo MediaStream llega con la 2ª pista: se cuentan los ids para
      // saber si de verdad hay vídeo remoto (no basta con la signal del stream).
      if (event.track.kind === 'video' && !this.remoteTrackIds.has(event.track.id)) {
        this.remoteTrackIds.add(event.track.id);
        this.remoteVideoTracks.set(this.remoteTrackIds.size);
      }
      this.remoteStream.set(event.streams[0] ?? new MediaStream([event.track]));
    };
    this.peer = pc;
  }

  private addLocalTracks(): void {
    const stream = this.localStream();
    if (!this.peer || !stream) return;
    for (const track of stream.getTracks()) this.peer.addTrack(track, stream);
  }

  /** Pide micrófono y, solo si la llamada es de vídeo, también cámara. */
  private async openLocalMedia(withVideo: boolean): Promise<void> {
    if (this.localStream()) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    if (withVideo) {
      try {
        this.setLocalStream(await navigator.mediaDevices.getUserMedia({ video: true, audio: true }));
        return;
      } catch {
        // Sin cámara: la llamada sigue como de voz (el SDP no llevará m=video).
      }
    }
    try {
      this.setLocalStream(await navigator.mediaDevices.getUserMedia({ audio: true }));
    } catch {
      throw new Error(withVideo ? 'No se pudo acceder a la cámara ni al micrófono.' : 'No se pudo acceder al micrófono.');
    }
  }

  private setLocalStream(stream: MediaStream): void {
    this.localStream.set(stream);
    const audio = stream.getAudioTracks()[0];
    const video = stream.getVideoTracks()[0];
    this.micEnabled.set(audio?.enabled ?? false);
    this.camEnabled.set(video?.enabled ?? false);
  }

  private async sendOffer(): Promise<void> {
    const pc = this.peer;
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdp = pc.localDescription?.sdp ?? offer.sdp ?? '';
      if (sdp) {
        // El SDP es la fuente de verdad: sin m=video la llamada es de voz.
        this.videoCall.set(sdp.includes('m=video'));
        await firstValueFrom(this.sendSignal('OFFER', sdp));
      }
    } catch {
      this.toast.error('No se pudo preparar la videollamada.', 'Señalización fallida');
    }
  }

  /** Prepara WebRTC del lado llamado antes de confirmar la aceptación. */
  private async prepareAnswer(): Promise<void> {
    if (typeof RTCPeerConnection === 'undefined') return;
    await this.openLocalMedia(this.videoCall());
    this.createPeer();
    this.addLocalTracks();
    if (this.pendingOffer) await this.answerNow();
  }

  /** Consume la oferta pendiente y envía la respuesta SDP. */
  private async answerNow(): Promise<void> {
    const pc = this.peer;
    const offer = this.pendingOffer;
    if (!pc || !offer || this.answerSent) return;
    this.pendingOffer = null;
    try {
      await pc.setRemoteDescription({ type: 'offer', sdp: offer });
      await this.flushPendingIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.answerSent = true;
      const sdp = pc.localDescription?.sdp ?? answer.sdp ?? '';
      if (sdp) await firstValueFrom(this.sendSignal('ANSWER', sdp));
    } catch {
      this.pendingOffer = offer;
      this.toast.error('No se pudo establecer la conexión de vídeo.', 'Señalización fallida');
    }
  }

  private sendSignal(type: CallSignalType, payload: string): Observable<void> {
    const call = this.call();
    if (!call) return throwError(() => new Error('No hay ninguna llamada en curso.'));
    return this.http.post<void>(`${this.url}/${call.id}/signal`, { type, payload });
  }

  private enqueue(event: CallEvent): void {
    this.eventChain = this.eventChain.then(() => this.processEvent(event)).catch(() => undefined);
  }

  private async processEvent(event: CallEvent): Promise<void> {
    const call = this.call();
    if (!call) return;
    switch (event.type) {
      case 'STATE':
        if (event.state === 'ENDED') {
          this.teardown(event.reason ?? 'FINISHED', false);
        } else if (event.state) {
          this.call.set({ ...call, state: event.state, endReason: event.reason ?? call.endReason });
        }
        break;
      case 'OFFER':
        await this.onOffer(event.payload);
        break;
      case 'ANSWER':
        await this.onAnswer(event.payload);
        break;
      case 'ICE':
        await this.onRemoteIce(event.payload);
        break;
      default:
        break;
    }
  }

  private async onOffer(payload: string | null): Promise<void> {
    if (!payload || !this.isCallee()) return;
    // El SDP de la oferta decide si el lado llamado pide cámara o solo audio.
    this.videoCall.set(payload.includes('m=video'));
    // Si aún no se ha aceptado, la oferta se consumirá al aceptar (prepareAnswer).
    if (!this.peer) {
      this.pendingOffer = payload;
      return;
    }
    this.pendingOffer = payload;
    await this.answerNow();
  }

  private async onAnswer(payload: string | null): Promise<void> {
    const pc = this.peer;
    if (!payload || !pc || !this.isCaller()) return;
    try {
      await pc.setRemoteDescription({ type: 'answer', sdp: payload });
      await this.flushPendingIce();
    } catch {
      this.toast.error('No se pudo establecer la conexión de vídeo.', 'Señalización fallida');
    }
  }

  private async onRemoteIce(payload: string | null): Promise<void> {
    if (!payload) return;
    let candidate: RTCIceCandidateInit;
    try {
      candidate = JSON.parse(payload) as RTCIceCandidateInit;
    } catch {
      return; // candidato malformado: se ignora
    }
    const pc = this.peer;
    if (pc?.remoteDescription) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // candidato obsoleto o de otra sesión: se descarta
      }
    } else {
      this.pendingIce.push(candidate);
    }
  }

  private async flushPendingIce(): Promise<void> {
    const pc = this.peer;
    if (!pc?.remoteDescription) return;
    const pending = this.pendingIce;
    this.pendingIce = [];
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // candidato descartado por el navegador: no bloquea la llamada
      }
    }
  }

  /**
   * Cierra la sesión local: sondeo, peer y streams. `reason` es el motivo del
   * final (null cuando no procede avisar) y `silent` suprime el aviso cuando
   * el cuelgue lo ha iniciado este mismo usuario.
   */
  private teardown(reason: CallEndReason | null, silent: boolean): void {
    const call = this.call();
    if (call) this.handledIds.add(call.id);
    this.stopPolling();
    const pc = this.peer;
    this.peer = null;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      try {
        pc.close();
      } catch {
        // peer ya cerrado
      }
    }
    this.remoteStream.set(null);
    const local = this.localStream();
    this.localStream.set(null);
    local?.getTracks().forEach(track => track.stop());
    this.micEnabled.set(true);
    this.camEnabled.set(true);
    this.call.set(null);
    this.lastSeq = INITIAL_CURSOR;
    this.pendingOffer = null;
    this.pendingIce = [];
    this.answerSent = false;
    this.videoCall.set(false);
    this.remoteTrackIds.clear();
    this.remoteVideoTracks.set(0);
    this.eventChain = Promise.resolve();
    if (silent || !reason) return;
    this.toast.info(END_MESSAGES[reason]);
  }
}
