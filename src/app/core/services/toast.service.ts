import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<ToastMessage[]>([]);
  private nextId = 1;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(message: string, title = 'Listo'): void {
    this.show('success', title, message);
  }

  error(message: string, title = 'Ocurrió un error'): void {
    this.show('error', title, message, 7000);
  }

  info(message: string, title = 'Información'): void {
    this.show('info', title, message);
  }

  errorFor(error: unknown, fallback: string): void {
    const value = error as { status?: number; error?: unknown; message?: string } | null;
    let message = fallback;

    if (value?.status === 0) {
      message = 'No se pudo conectar con el servidor. Comprueba que el backend esté activo.';
    } else if (value?.status === 401) {
      message = 'Tu sesión ya no es válida. Inicia sesión de nuevo.';
    } else if (value?.status === 403) {
      message = 'Tu cuenta no tiene permiso para realizar esta acción.';
    } else if (typeof value?.error === 'string' && value.error.trim()) {
      message = value.error;
    } else if (value?.error && typeof value.error === 'object' && 'message' in value.error
      && typeof value.error.message === 'string') {
      message = value.error.message;
    } else if (value?.message && value.status !== undefined) {
      message = value.message;
    }

    this.error(message);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.messages.update(messages => messages.filter(item => item.id !== id));
  }

  private show(kind: ToastKind, title: string, message: string, duration = 5000): void {
    const id = this.nextId++;
    this.messages.update(messages => [...messages, { id, kind, title, message }].slice(-5));
    this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
  }
}
