import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ChatService } from '../core/services/chat.service';
import { IncomingPushMessage, PushNotificationService } from '../core/services/push-notification.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-message-notification-viewport',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="message-notification-stack" aria-label="Mensajes nuevos" aria-live="polite">
      @for (message of push.incomingMessages(); track message.messageId) {
        <article class="message-notification-card">
          <header class="message-notification-header">
            <span class="message-notification-avatar" aria-hidden="true">{{ initials(message.senderName) }}</span>
            <div class="message-notification-heading">
              <strong>{{ message.senderName }}</strong>
              <span>{{ channelLabel(message) }}</span>
            </div>
            <button type="button" class="message-notification-close" (click)="dismiss(message)" aria-label="Cerrar aviso">×</button>
          </header>

          <p class="message-notification-body">{{ message.body }}</p>

          <form class="message-notification-reply" (ngSubmit)="reply(message)">
            <input
              type="text"
              maxlength="2000"
              [ngModel]="drafts()[message.messageId] || ''"
              (ngModelChange)="setDraft(message.messageId, $event)"
              [name]="'reply-' + message.messageId"
              [placeholder]="'Responder a ' + message.senderName + '…'"
              [attr.aria-label]="'Responder a ' + message.senderName"
            />
            <button type="submit" [disabled]="!drafts()[message.messageId]?.trim() || sendingIds().has(message.messageId)">
              {{ sendingIds().has(message.messageId) ? 'Enviando…' : 'Enviar' }}
            </button>
          </form>

          @if (errors()[message.messageId]) {
            <p class="message-notification-error" role="alert">{{ errors()[message.messageId] }}</p>
          }
          <button type="button" class="message-notification-open" (click)="openChat(message)">Abrir conversación</button>
        </article>
      }
    </aside>
  `
})
export class MessageNotificationViewportComponent {
  readonly push = inject(PushNotificationService);
  private readonly chat = inject(ChatService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly drafts = signal<Record<string, string>>({});
  readonly sendingIds = signal(new Set<string>());
  readonly errors = signal<Record<string, string>>({});
  private previousUnreadCounts = new Map<string, number>();
  private hasUnreadBaseline = false;
  private poller: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    )
      .subscribe(event => {
        if (event.urlAfterRedirects.startsWith('/dashboard')) this.startMessagePolling();
        else this.stopMessagePolling();
      });
    this.destroyRef.onDestroy(() => this.stopMessagePolling());
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'TM';
  }

  channelLabel(message: IncomingPushMessage): string {
    return message.title.replace(/^Nuevo mensaje en\s*/i, '') || 'Mensaje nuevo';
  }

  setDraft(messageId: string, value: string): void {
    this.drafts.update(drafts => ({ ...drafts, [messageId]: value }));
    this.errors.update(errors => ({ ...errors, [messageId]: '' }));
  }

  reply(message: IncomingPushMessage): void {
    const text = this.drafts()[message.messageId]?.trim();
    if (!text || this.sendingIds().has(message.messageId)) return;
    const request = this.chat.sendTo(message.channelId, text);
    if (!request) {
      this.errors.update(errors => ({ ...errors, [message.messageId]: 'Espera a que termine el envío anterior.' }));
      return;
    }

    this.sendingIds.update(ids => new Set(ids).add(message.messageId));
    request.subscribe({
      next: () => this.dismiss(message),
      error: () => this.errors.update(errors => ({ ...errors, [message.messageId]: 'No se pudo enviar. Inténtalo de nuevo.' })),
      complete: () => this.sendingIds.update(ids => {
        const next = new Set(ids);
        next.delete(message.messageId);
        return next;
      })
    });
  }

  dismiss(message: IncomingPushMessage): void {
    this.push.dismissMessage(message.messageId);
    this.drafts.update(drafts => {
      const next = { ...drafts };
      delete next[message.messageId];
      return next;
    });
  }

  openChat(message: IncomingPushMessage): void {
    this.dismiss(message);
    void this.router.navigate(['/dashboard/chat'], { queryParams: { channelId: message.channelId } });
  }

  private startMessagePolling(): void {
    if (this.poller) return;
    this.previousUnreadCounts.clear();
    this.hasUnreadBaseline = false;
    this.chat.loadChannels().subscribe({ error: () => {} });
    this.chat.refreshUnreadCounts().subscribe({
      next: counts => {
        this.previousUnreadCounts = new Map(Object.entries(counts));
        this.hasUnreadBaseline = true;
      },
      error: () => {}
    });
    this.poller = setInterval(() => this.pollForNewMessages(), 4000);
  }

  private stopMessagePolling(): void {
    if (this.poller) clearInterval(this.poller);
    this.poller = null;
    this.previousUnreadCounts.clear();
    this.hasUnreadBaseline = false;
  }

  private pollForNewMessages(): void {
    if (document.visibilityState !== 'visible' || !this.auth.isAuthenticated() || !this.hasUnreadBaseline) return;
    this.chat.markDelivered();
    this.chat.refreshUnreadCounts().subscribe({
      next: counts => {
        const previous = this.previousUnreadCounts;
        this.previousUnreadCounts = new Map(Object.entries(counts));
        for (const [channelId, count] of Object.entries(counts)) {
          if (count <= (previous.get(channelId) ?? 0) || channelId === this.chat.activeChannelId()) continue;
          this.chat.getLatestMessage(channelId).subscribe({
            next: messages => {
              const message = messages.at(-1);
              if (!message || message.authorId === this.auth.currentUser()?.id) return;
              const channel = this.chat.channels().find(item => item.id === channelId);
              this.push.showIncomingMessage({
                channelId,
                messageId: message.id,
                senderName: message.authorName || 'Nuevo mensaje',
                title: `Nuevo mensaje en ${channel?.name || channel?.otherUserName || 'conversación'}`,
                body: message.body || 'Tienes un nuevo mensaje',
                timestamp: Date.parse(message.createdAt) || Date.now()
              });
            },
            error: () => {}
          });
        }
      },
      error: () => {}
    });
  }
}
