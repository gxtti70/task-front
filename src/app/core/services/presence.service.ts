import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PresenceEntry, PresenceStatus, User } from '../models';
import { environment } from '../../../environments/environment';
import { orderedPresenceStatuses, presenceDotColor, presenceIcon, presenceLabel, suppressesPush } from '../utils/presence.utils';

const API_URL = `${environment.apiUrl}/presence`;
const HEARTBEAT_INTERVAL_MS = 60_000;  // cada 60 s
const PRESENCE_POLL_INTERVAL_MS = 20_000;  // cada 20 s
const IDLE_AFTER_MS = 5 * 60_000;  // 5 min sin actividad -> idle

type PresenceMapResponse = Record<string, { status: PresenceStatus; lastSeenAt: string | null }>;

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private readonly http = inject(HttpClient);

  /** Mi propio estado de presencia (manual), reflectido del backend. */
  readonly myStatus = signal<PresenceStatus | null>(null);

  /** Presencia de todos los usuarios activos: userId -> entrada. */
  readonly byUserId = signal<Map<string, PresenceEntry>>(new Map());

  private activityTimestamp = Date.now();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const markActivity = () => { this.activityTimestamp = Date.now(); };
    for (const event of ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']) {
      document.addEventListener(event, markActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
      else this.start();
    });
  }

  /** Entrada de presencia de un usuario concreto. */
  get(userId: string | null): PresenceEntry | undefined {
    if (!userId) return undefined;
    return this.byUserId().get(userId);
  }

  /** Color del punto de presencia de un usuario. */
  color(userId: string | null): string {
    const entry = this.get(userId);
    return entry ? presenceDotColor(entry.status) : presenceDotColor('OFFLINE');
  }

  /** Etiqueta en español del estado de un usuario. */
  label(userId: string | null): string {
    const entry = this.get(userId);
    return entry ? presenceLabel(entry.status) : presenceLabel('OFFLINE');
  }

  /** Si un usuario suprime notificaciones push (No molestar). */
  isPushSuppressed(userId: string | null): boolean {
    const entry = this.get(userId);
    return entry ? suppressesPush(entry.status) : false;
  }

  private isIdle(): boolean {
    return Date.now() - this.activityTimestamp > IDLE_AFTER_MS;
  }

  /** Inicia heartbeat y sondeo de presencia (solo con pestaña visible). */
  start(): void {
    this.stop();
    this.heartbeat();
    this.refreshPresenceMap();
    this.heartbeatTimer = setInterval(() => this.heartbeat(), HEARTBEAT_INTERVAL_MS);
    this.pollTimer = setInterval(() => this.refreshPresenceMap(), PRESENCE_POLL_INTERVAL_MS);
  }

  /** Detiene heartbeat y sondeo. */
  stop(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.heartbeatTimer = null;
    this.pollTimer = null;
  }

  heartbeat(): void {
    if (typeof document === 'undefined' || document.hidden) return;
    this.http.post(`${API_URL}/heartbeat`, { idle: this.isIdle() }, { withCredentials: true }).subscribe({
      error: () => {}
    });
  }

  refreshPresenceMap(): void {
    this.http.get<PresenceMapResponse>(API_URL, { withCredentials: true }).subscribe({
      next: raw => {
        const map = new Map<string, PresenceEntry>();
        for (const [userId, entry] of Object.entries(raw)) {
          map.set(userId, { userId, status: entry.status, lastSeenAt: entry.lastSeenAt ?? null });
        }
        this.byUserId.set(map);
      },
      error: () => {}
    });
  }

  /** Establece mi estado de presencia y lo persiste en el backend. */
  setStatus(status: PresenceStatus): Observable<{ userId: string; status: PresenceStatus }> {
    return this.http.put<{ userId: string; status: PresenceStatus }>(`${API_URL}/me`, { status }, { withCredentials: true }).pipe(
      tap(res => {
        this.myStatus.set(res.status);
        this.byUserId.update(map => {
          const next = new Map(map);
          next.set(res.userId, { userId: res.userId, status: res.status, lastSeenAt: null });
          return next;
        });
      }),
      catchError(err => {
        console.error('No se pudo actualizar el estado de presencia', err);
        return throwError(() => err);
      })
    );
  }

  /** Estados que el usuario puede elegir en el selector (excluye OFFLINE derivado). */
  readonly statuses = orderedPresenceStatuses();

  /** Etiqueta de un estado para mostrar en el selector. */
  statusLabel(status: PresenceStatus): string {
    return presenceLabel(status);
  }

  /** Color de un estado para el punto. */
  statusColor(status: PresenceStatus): string {
    return presenceDotColor(status);
  }

  /** Icono de un estado para el selector. */
  statusIcon(status: PresenceStatus): string {
    return presenceIcon(status);
  }
}
