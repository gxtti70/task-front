import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { CallService } from '../core/services/call.service';
import { ChatService } from '../core/services/chat.service';
import { AuthService } from '../core/services/auth.service';
import { ToastService } from '../core/services/toast.service';
import { FocusTrapDirective } from './directives/focus-trap.directive';

/**
 * Vista global de videollamadas: tarjeta de llamada entrante y panel de
 * llamada en curso, montada en la raíz de la aplicación (patrón de los
 * avisos de mensajes) para que una llamada entrante se muestre en cualquier
 * pantalla del dashboard.
 */
@Component({
  selector: 'app-call-viewport',
  standalone: true,
  imports: [LucideAngularModule, FocusTrapDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './call-viewport.component.html'
})
export class CallViewportComponent {
  readonly calls = inject(CallService);
  private readonly chat = inject(ChatService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Reloj para el contador de duración de la llamada. */
  readonly now = signal(Date.now());
  private readonly activeSince = signal(0);
  private discoveryTimer: ReturnType<typeof setInterval> | null = null;

  private readonly remoteVideo = viewChild<ElementRef<HTMLVideoElement>>('remoteVideo');
  private readonly localVideo = viewChild<ElementRef<HTMLVideoElement>>('localVideo');

  /** Nombre visible de la contraparte de la llamada. */
  readonly peerName = computed(() => {
    const call = this.calls.call();
    if (!call) return 'Conversación';
    const channel = this.chat.channels().find(item => item.id === call.channelId);
    if (channel) return channel.otherUserName || channel.name || 'Conversación';
    const self = this.auth.currentUser()?.id ?? '';
    return call.calleeId === self ? 'Llamada entrante' : 'Videollamada';
  });

  readonly statusLabel = computed(() => {
    const call = this.calls.call();
    if (!call) return '';
    if (call.state === 'RINGING') return this.calls.isCallee() ? 'Te está llamando…' : 'Llamando…';
    if (call.state === 'ACTIVE') return this.calls.remoteStream() ? 'En llamada' : 'Conectando…';
    return 'Finalizada';
  });

  readonly durationLabel = computed(() => {
    if (this.calls.call()?.state !== 'ACTIVE' || !this.activeSince()) return '';
    const seconds = Math.max(0, Math.floor((this.now() - this.activeSince()) / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  });

  constructor() {
    // Marca cuándo empezó la llamada activa para medir la duración.
    effect(() => {
      const active = this.calls.call()?.state === 'ACTIVE';
      if (active && !this.activeSince()) this.activeSince.set(Date.now());
      else if (!active && this.activeSince()) this.activeSince.set(0);
    });
    // Los streams no se enlazan con [srcObject]: se asignan de forma imperativa.
    effect(() => this.attach(this.remoteVideo(), this.calls.remoteStream(), false));
    effect(() => this.attach(this.localVideo(), this.calls.localStream(), true));

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      if (event.urlAfterRedirects.startsWith('/dashboard')) this.startDiscovery();
      else this.stopDiscovery();
    });
    if (this.router.url.startsWith('/dashboard')) this.startDiscovery();

    const ticker = setInterval(() => {
      if (this.calls.call()?.state === 'ACTIVE') this.now.set(Date.now());
    }, 1000);
    this.destroyRef.onDestroy(() => {
      this.stopDiscovery();
      clearInterval(ticker);
    });
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'TM';
  }

  accept(): void {
    if (this.calls.starting()) return;
    this.calls.acceptCall().subscribe({
      error: error => this.toast.errorFor(error, 'No se pudo aceptar la llamada.')
    });
  }

  decline(): void {
    this.calls.declineCall();
  }

  hangUp(): void {
    this.calls.hangUp();
  }

  private startDiscovery(): void {
    if (this.discoveryTimer) return;
    this.calls.refreshActive();
    this.discoveryTimer = setInterval(() => {
      if (document.visibilityState === 'visible') this.calls.refreshActive();
    }, this.calls.activePollIntervalMs);
  }

  private stopDiscovery(): void {
    if (this.discoveryTimer) clearInterval(this.discoveryTimer);
    this.discoveryTimer = null;
  }

  private attach(reference: ElementRef<HTMLVideoElement> | undefined, stream: MediaStream | null, muted: boolean): void {
    const video = reference?.nativeElement;
    if (!video) return;
    video.muted = muted; // el vídeo propio nunca reproduce audio (evita eco)
    if (video.srcObject === stream) return;
    video.srcObject = stream;
    if (stream) video.play().catch(() => { /* reproducción automática bloqueada: el usuario ya interactuó */ });
  }
}
