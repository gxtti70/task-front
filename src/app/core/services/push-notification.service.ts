import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PushSubscriptionDto {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/push`;
  private registration: ServiceWorkerRegistration | null = null;

  readonly isSupported = signal(typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window);
  readonly permission = signal<NotificationPermission>('default');
  readonly isSubscribed = signal(false);
  readonly vapidPublicKey = signal<string | null>(null);

  constructor() {
    if (this.isSupported()) {
      void this.init();
    }
  }

  private async init(): Promise<void> {
    try {
      const keys = await firstValueFrom(this.http.get<{ publicKey: string }>(`${this.url}/vapid-public-key`));
      this.vapidPublicKey.set(keys?.publicKey ?? null);

      this.registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });

      navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
        const data = event.data as { type: string; channelId?: string; text?: string };
        if (data.type === 'PUSH_REPLY' && data.channelId && data.text) {
          this.onPushReply.emit({ channelId: data.channelId, text: data.text });
        }
      });

      const existing = await this.registration.pushManager.getSubscription();
      this.isSubscribed.set(!!existing);
      this.permission.set(Notification.permission);

      if (existing && this.vapidPublicKey()) {
        await this.sendSubscriptionToBackend(existing);
      }
    } catch (err) {
      console.warn('Push notifications no disponibles:', err);
    }
  }

  /** Observable-like emitter para respuestas desde notificaciones push. */
  readonly onPushReply = new (class {
    private callbacks: Array<(data: { channelId: string; text: string }) => void> = [];
    subscribe(cb: (data: { channelId: string; text: string }) => void) { this.callbacks.push(cb); }
    emit(data: { channelId: string; text: string }) { this.callbacks.forEach(cb => cb(data)); }
  })();

  async subscribe(): Promise<boolean> {
    if (!this.isSupported() || !this.registration || !this.vapidPublicKey()) return false;
    try {
      this.permission.set(Notification.permission);
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        this.permission.set(perm);
        if (perm !== 'granted') return false;
      }
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey()!) as unknown as BufferSource;
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      this.isSubscribed.set(true);
      await this.sendSubscriptionToBackend(subscription);
      return true;
    } catch (err) {
      console.error('Error suscribiendo a push:', err);
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.registration) return false;
    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await firstValueFrom(this.http.post(`${this.url}/unsubscribe`, { endpoint: subscription.endpoint }));
        await subscription.unsubscribe();
        this.isSubscribed.set(false);
        return true;
      }
    } catch (err) {
      console.error('Error desuscribiendo de push:', err);
    }
    return false;
  }

  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    const p256dhKey = subscription.getKey('p256dh');
    const authKey = subscription.getKey('auth');
    const p256dh = p256dhKey ? this.uint8ArrayToBase64(new Uint8Array(p256dhKey as ArrayBuffer)) : '';
    const auth = authKey ? this.uint8ArrayToBase64(new Uint8Array(authKey as ArrayBuffer)) : '';
    await firstValueFrom(this.http.post(`${this.url}/subscribe`, {
      endpoint: subscription.endpoint,
      p256dhKey: p256dh,
      authKey: auth
    }));
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      output[i] = raw.charCodeAt(i);
    }
    return output as unknown as Uint8Array;
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
