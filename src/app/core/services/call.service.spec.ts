import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CallService } from './call.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { CallEvent, CallSnapshot } from '../models';

const ME = 'user-me';
const PEER = 'user-peer';

function snapshot(overrides: Partial<CallSnapshot> = {}): CallSnapshot {
  return {
    id: 'call-1',
    channelId: 'chan-1',
    callerId: ME,
    calleeId: PEER,
    state: 'RINGING',
    endReason: null,
    seq: 1,
    createdAt: '2026-11-23T10:00:00',
    ...overrides
  };
}

function event(overrides: Partial<CallEvent> = {}): CallEvent {
  return {
    seq: 1,
    type: 'STATE',
    fromUserId: ME,
    payload: null,
    state: 'RINGING',
    reason: null,
    createdAt: '2026-11-23T10:00:01',
    ...overrides
  };
}

/** Sincroniza las promesas internas (defer, getUserMedia) entre peticiones. */
const flushAsync = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/**
 * Doble de RTCPeerConnection para ejercer el flujo WebRTC en jsdom (no lo
 * implementa): solo registra las llamadas y permite emitir candidatos.
 */
class FakePeerConnection {
  static readonly instances: FakePeerConnection[] = [];

  onicecandidate: ((event: { candidate: { toJSON: () => RTCIceCandidateInit } | null }) => void) | null = null;
  ontrack: ((event: { streams: MediaStream[]; track: MediaStreamTrack }) => void) | null = null;
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  readonly addedTracks: MediaStreamTrack[] = [];
  readonly remoteCandidates: RTCIceCandidateInit[] = [];

  constructor(_config?: RTCConfiguration) {
    FakePeerConnection.instances.push(this);
  }

  addTrack(track: MediaStreamTrack): void {
    this.addedTracks.push(track);
  }

  createOffer(): Promise<RTCSessionDescriptionInit> {
    return Promise.resolve({ type: 'offer', sdp: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\n' });
  }

  createAnswer(): Promise<RTCSessionDescriptionInit> {
    return Promise.resolve({ type: 'answer', sdp: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\n' });
  }

  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = description;
    return Promise.resolve();
  }

  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = description;
    return Promise.resolve();
  }

  addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    this.remoteCandidates.push(candidate);
    return Promise.resolve();
  }

  close(): void { /* nada que liberar en el doble */ }

  /** Simula que el navegador recoge un candidato y lanza onicecandidate. */
  emitCandidate(candidate: RTCIceCandidateInit): void {
    this.onicecandidate?.({ candidate: { toJSON: () => candidate } });
  }
}

describe('CallService', () => {
  let service: CallService;
  let http: HttpTestingController;
  let auth: AuthService;
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    service = TestBed.inject(CallService);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.stopPolling();
    http.verify();
    // Limpia los dobles que alguna prueba haya instalado en el entorno.
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    Object.defineProperty(window, 'RTCPeerConnection', { value: undefined, configurable: true });
    FakePeerConnection.instances.length = 0;
  });

  /** Simula la sesión iniciada como el usuario indicado. */
  function loginAs(id: string): void {
    auth.loadProfile().subscribe({ error: () => { /* lo comprueba cada prueba */ } });
    http.expectOne('/api/auth/me').flush({ id, email: `${id}@example.test`, fullName: 'Usuario', role: 'DEVELOPER' });
  }

  it('crea la llamada desde el DM y guarda la instantánea como llamante', async () => {
    loginAs(ME);
    let failure: unknown = null;
    service.startCall('chan-1').subscribe({ error: error => failure = error });

    await flushAsync();
    const request = http.expectOne('/api/calls');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ channelId: 'chan-1' });
    request.flush(snapshot());

    expect(failure).toBeNull();
    expect(service.call()?.id).toBe('call-1');
    expect(service.isCaller()).toBe(true);
    expect(service.isCallee()).toBe(false);
    expect(service.starting()).toBe(false);
    service.stopPolling();
  });

  it('no toca el backend si el navegador deniega la cámara', async () => {
    loginAs(ME);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.reject(new Error('permiso denegado')) },
      configurable: true
    });

    let failure: unknown = null;
    service.startCall('chan-1').subscribe({ error: error => failure = error });
    await flushAsync();

    expect(failure).toBeInstanceOf(Error);
    expect(service.call()).toBeNull();
    http.expectNone('/api/calls');
  });

  it('sondea los eventos con el cursor propio y lo va avanzando', async () => {
    loginAs(ME);
    service.startCall('chan-1').subscribe({ error: () => { /* lo comprueba la prueba */ } });
    await flushAsync();
    http.expectOne('/api/calls').flush(snapshot());
    service.stopPolling();

    service.pollEvents();
    http.expectOne('/api/calls/call-1/events?after=0').flush([event({ seq: 1, state: 'RINGING' })]);
    await flushAsync();

    service.pollEvents();
    http.expectOne('/api/calls/call-1/events?after=1').flush([]);
  });

  it('cierra la llamada y avisa cuando el evento STATE llega con ENDED', async () => {
    loginAs(ME);
    service.startCall('chan-1').subscribe({ error: () => { /* lo comprueba la prueba */ } });
    await flushAsync();
    http.expectOne('/api/calls').flush(snapshot());

    service.pollEvents();
    http.expectOne('/api/calls/call-1/events?after=0')
      .flush([event({ seq: 1, type: 'STATE', state: 'ENDED', reason: 'DECLINED' })]);
    await flushAsync();

    expect(service.call()).toBeNull();
    expect(service.localStream()).toBeNull();
    expect(service.remoteStream()).toBeNull();
    expect(toast.messages().some(item => item.message.includes('rechazado'))).toBe(true);
  });

  it('adopta la llamada entrante cuando soy la persona llamada', () => {
    loginAs(PEER);
    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot()]);

    expect(service.call()?.id).toBe('call-1');
    expect(service.isCallee()).toBe(true);
    expect(service.isCaller()).toBe(false);
    service.stopPolling();
  });

  it('ignora las llamadas de otras personas y las activas sin sesión local', () => {
    loginAs(ME);
    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot({ calleeId: 'otro-usuario' })]);
    expect(service.call()).toBeNull();

    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot({ state: 'ACTIVE' })]);
    expect(service.call()).toBeNull();
  });

  it('acepta la llamada entrante y el backend la pasa a ACTIVE', async () => {
    loginAs(PEER);
    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot()]);
    service.stopPolling();

    let failure: unknown = null;
    service.acceptCall().subscribe({ error: error => failure = error });
    await flushAsync();

    const answer = http.expectOne('/api/calls/call-1/answer');
    expect(answer.request.method).toBe('POST');
    answer.flush(snapshot({ state: 'ACTIVE', seq: 2 }));

    expect(failure).toBeNull();
    expect(service.call()?.state).toBe('ACTIVE');
    service.stopPolling();
  });

  it('rechaza la llamada entrante y limpia el estado local', () => {
    loginAs(PEER);
    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot()]);

    service.declineCall();
    http.expectOne('/api/calls/call-1/decline').flush(snapshot({ state: 'ENDED', endReason: 'DECLINED' }));

    expect(service.call()).toBeNull();
    expect(service.localStream()).toBeNull();
  });

  it('cuelga la llamada en curso y limpia el estado local', async () => {
    loginAs(ME);
    service.startCall('chan-1').subscribe({ error: () => { /* lo comprueba la prueba */ } });
    await flushAsync();
    http.expectOne('/api/calls').flush(snapshot());

    service.hangUp();
    http.expectOne('/api/calls/call-1/end').flush(snapshot({ state: 'ENDED', endReason: 'FINISHED' }));

    expect(service.call()).toBeNull();
    expect(service.localStream()).toBeNull();
  });

  it('cuelga localmente cuando los eventos devuelven 404 (sesión purgada)', async () => {
    loginAs(ME);
    service.startCall('chan-1').subscribe({ error: () => { /* lo comprueba la prueba */ } });
    await flushAsync();
    http.expectOne('/api/calls').flush(snapshot());

    service.pollEvents();
    http.expectOne('/api/calls/call-1/events?after=0').flush('No encontrado', { status: 404, statusText: 'Not Found' });
    await flushAsync();

    expect(service.call()).toBeNull();
    expect(toast.messages().some(item => item.message.includes('finalizado'))).toBe(true);
  });

  it('no vuelve a mostrar una llamada ya gestionada por el usuario', () => {
    loginAs(PEER);
    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot()]);
    service.declineCall();
    http.expectOne('/api/calls/call-1/decline').flush(snapshot({ state: 'ENDED', endReason: 'DECLINED' }));

    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot()]);

    expect(service.call()).toBeNull();
  });

  it('envía la oferta y cada candidato ICE al otro extremo', async () => {
    Object.defineProperty(window, 'RTCPeerConnection', { value: FakePeerConnection, configurable: true });
    loginAs(ME);

    service.startCall('chan-1').subscribe({ error: () => { /* lo comprueba la prueba */ } });
    await flushAsync();
    http.expectOne('/api/calls').flush(snapshot());
    await flushAsync();

    // La oferta SDP sale suscrita (firstValueFrom).
    const offer = http.expectOne('/api/calls/call-1/signal');
    expect(offer.request.body).toEqual({ type: 'OFFER', payload: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\n' });
    offer.flush(null);

    // Regresión: el envío de candidatos ICE estaba en un observable sin suscribir
    // y nunca salía la petición, por lo que no había conexión P2P (ni audio ni vídeo).
    const peer = FakePeerConnection.instances.at(-1);
    expect(peer).toBeDefined();
    const candidate: RTCIceCandidateInit = {
      candidate: 'candidate:1 1 UDP 2122252543 192.168.1.5 50000 typ host',
      sdpMid: '0',
      sdpMLineIndex: 0
    };
    peer?.emitCandidate(candidate);
    await flushAsync();

    const ice = http.expectOne('/api/calls/call-1/signal');
    expect(ice.request.body).toEqual({ type: 'ICE', payload: JSON.stringify(candidate) });
    ice.flush(null);

    expect(service.call()).not.toBeNull();
    service.stopPolling();
  });
});
