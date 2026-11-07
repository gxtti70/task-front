import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, tap } from 'rxjs';
import { Channel, ChannelRequest, ChatMessage, DirectChannelRequest } from '../models';
import { environment } from '../../../environments/environment';

const MESSAGE_PAGE_SIZE = 50;
const POLL_INTERVAL_MS = 4000;

function compareAscending(a: ChatMessage, b: ChatMessage): number {
  const timeDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  return timeDiff !== 0 ? timeDiff : a.id.localeCompare(b.id);
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/channels`;
  /** Intervalo de sondeo usado por la vista (solo refresca si la pestaña está visible). */
  readonly pollIntervalMs = POLL_INTERVAL_MS;
  private readonly messagePageSize = MESSAGE_PAGE_SIZE;

  /** Incrementa en cada carga; descarta respuestas de canales ya abandonados. */
  private fetchToken = 0;
  private oldestCursor: { id: string } | null = null;

  readonly channels = signal<Channel[]>([]);
  readonly activeChannelId = signal<string | null>(null);
  readonly activeChannel = computed(() =>
    this.channels().find(channel => channel.id === this.activeChannelId()) ?? null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly hasMoreMessages = signal(false);
  readonly loadingMessages = signal(false);
  readonly loadingOlderMessages = signal(false);
  readonly sendingMessage = signal(false);
  readonly typingUsers = signal<Map<string, string>>(new Map());
  readonly unreadCounts = signal<Map<string, number>>(new Map());

  loadChannels(): Observable<Channel[]> {
    return this.http.get<Channel[]>(this.url).pipe(tap(list => this.channels.set(list)));
  }

  openChannel(id: string): void {
    if (this.activeChannelId() === id) return;
    this.activeChannelId.set(id);
    this.messages.set([]);
    this.hasMoreMessages.set(false);
    this.oldestCursor = null;
    this.fetchLatestMessages(id);
  }

  /** Sondeo combinado: lista de canales + página vigente del canal abierto. */
  pollWhenVisible(): void {
    const activeId = this.activeChannelId();
    this.loadChannels().subscribe({ error: () => { /* el interceptor gestiona el 401; fallos transitorios se ignoran */ } });
    if (activeId) this.fetchLatestMessages(activeId);
  }

  loadOlderMessages(): void {
    const channelId = this.activeChannelId();
    const cursor = this.oldestCursor;
    if (!channelId || !cursor || this.hasMoreNotAvailable() || this.loadingOlderMessages()) return;
    const tokenAtStart = this.fetchToken;
    this.loadingOlderMessages.set(true);
    this.http.get<ChatMessage[]>(`${this.url}/${channelId}/messages`, {
      params: { before: cursor.id, limit: this.messagePageSize }
    }).subscribe({
      next: older => {
        this.loadingOlderMessages.set(false);
        if (this.fetchToken !== tokenAtStart) return;
        if (!older.length) {
          this.hasMoreMessages.set(false);
          return;
        }
        this.mergeMessages(older);
        this.hasMoreMessages.set(older.length === this.messagePageSize);
      },
      error: () => this.loadingOlderMessages.set(false)
    });
  }

  send(body: string): void {
    const channelId = this.activeChannelId();
    if (!channelId) return;
    this.sendTo(channelId, body)?.subscribe({ error: () => {} });
  }

  /** Envía un mensaje a un canal específico, también desde la respuesta rápida global. */
  sendTo(channelId: string, body: string): Observable<ChatMessage> | null {
    const text = body.trim();
    if (!channelId || !text || this.sendingMessage()) return null;
    this.sendingMessage.set(true);
    return this.http.post<ChatMessage>(`${this.url}/${channelId}/messages`, { body: text }).pipe(
      tap({ next: message => {
        if (this.activeChannelId() === channelId) this.mergeMessages([message]);
        this.markAsRead(channelId);
      }}),
      finalize(() => this.sendingMessage.set(false))
    );
  }

  sendFile(channelId: string, file: File, body = ''): void {
    if (!channelId || this.sendingMessage()) return;
    this.sendingMessage.set(true);
    const formData = new FormData();
    formData.append('file', file);
    if (body.trim()) formData.append('body', body.trim());
    this.http.post<ChatMessage>(`${this.url}/${channelId}/messages/file`, formData).subscribe({
      next: message => {
        this.sendingMessage.set(false);
        if (this.activeChannelId() === channelId) this.mergeMessages([message]);
        // El remitente no ve su propio archivo como no leído.
        this.markAsRead(channelId);
      },
      error: () => this.sendingMessage.set(false)
    });
  }

  downloadFile(channelId: string, messageId: string): void {
    window.location.href = `${this.url}/${channelId}/messages/${messageId}/file`;
  }

  deleteFile(channelId: string, messageId: string): void {
    this.http.delete(`${this.url}/${channelId}/messages/${messageId}/file`).subscribe({
      next: () => {
        this.messages.update(list => list.filter(m => m.id !== messageId));
      },
      error: () => {}
    });
  }

  fetchUnreadCounts(): void {
    this.http.get<Record<string, number>>(`${this.url}/unread-counts`).subscribe({
      next: counts => {
        const map = new Map<string, number>();
        for (const [channelId, count] of Object.entries(counts)) {
          map.set(channelId, count);
        }
        this.unreadCounts.set(map);
      },
      error: () => {}
    });
  }

  refreshUnreadCounts(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.url}/unread-counts`).pipe(tap(counts => {
      const map = new Map<string, number>();
      for (const [channelId, count] of Object.entries(counts)) map.set(channelId, count);
      this.unreadCounts.set(map);
    }));
  }

  getLatestMessage(channelId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.url}/${channelId}/messages`, { params: { limit: 1 } });
  }

  markAsRead(channelId: string): void {
    this.http.post(`${this.url}/${channelId}/read`, null).subscribe({
      next: () => {
        this.unreadCounts.update(map => {
          const next = new Map(map);
          next.set(channelId, 0);
          return next;
        });
      },
      error: () => {}
    });
  }

  getUnreadCount(channelId: string): number {
    return this.unreadCounts().get(channelId) ?? 0;
  }

  createChannel(request: ChannelRequest): Observable<Channel> {
    return this.http.post<Channel>(this.url, request).pipe(tap(channel => this.upsertChannel(channel)));
  }

  openDirectChannel(memberId: string): Observable<Channel> {
    return this.http.post<Channel>(`${this.url}/direct`, { memberId }).pipe(tap(channel => {
      this.upsertChannel(channel);
      this.openChannel(channel.id);
    }));
  }

  private hasMoreNotAvailable(): boolean {
    return !this.hasMoreMessages();
  }

  private fetchLatestMessages(channelId: string): void {
    const token = ++this.fetchToken;
    this.loadingMessages.set(true);
    this.http.get<ChatMessage[]>(`${this.url}/${channelId}/messages`, {
      params: { limit: this.messagePageSize }
    }).subscribe({
      next: latest => {
        this.loadingMessages.set(false);
        if (this.fetchToken !== token) return; // el usuario cambió de canal
        this.mergeMessages(latest);
        if (latest.length === this.messagePageSize) this.hasMoreMessages.set(true);
      },
      error: () => this.loadingMessages.set(false)
    });
  }

  private mergeMessages(incoming: ChatMessage[]): void {
    const byId = new Map(this.messages().map(message => [message.id, message]));
    for (const message of incoming) byId.set(message.id, message);
    const merged = [...byId.values()].sort(compareAscending);
    this.messages.set(merged);
    const oldest = merged.at(0);
    if (oldest) this.oldestCursor = { id: oldest.id };
  }

  private upsertChannel(channel: Channel): void {
    this.channels.update(list => [channel, ...list.filter(item => item.id !== channel.id)]);
  }
}
