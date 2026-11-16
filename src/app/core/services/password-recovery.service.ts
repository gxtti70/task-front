import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'taskmanager.password-recovery';

interface RecoveryState {
  email: string;
  cooldownUntil: number;
}

/**
 * Estado del flujo de recuperación de contraseña.
 *
 * <p>Guarda el correo en `sessionStorage` para que un refresco de la página no
 * obligue a escribirlo de nuevo, y el instante en que expires el tiempo de espera
 * para reenviar el código.
 */
@Injectable({ providedIn: 'root' })
export class PasswordRecoveryService {
  private readonly emailState = signal('');
  private readonly cooldownState = signal(0);

  readonly email = this.emailState.asReadonly();
  readonly cooldownUntil = this.cooldownState.asReadonly();

  constructor() {
    const stored = this.read();
    this.emailState.set(stored.email);
    this.cooldownState.set(stored.cooldownUntil);
  }

  setEmail(email: string): void {
    this.emailState.set(email.trim());
    this.persist();
  }

  /** Registra el tiempo de espera antes de poder pedir un nuevo código. */
  setCooldown(seconds: number): void {
    this.cooldownState.set(Date.now() + Math.max(0, seconds) * 1000);
    this.persist();
  }

  /** Segundos restantes antes de poder reenviar el código. */
  remainingSeconds(): number {
    return Math.max(0, Math.ceil((this.cooldownState() - Date.now()) / 1000));
  }

  canResend(): boolean {
    return this.remainingSeconds() === 0;
  }

  clear(): void {
    this.emailState.set('');
    this.cooldownState.set(0);
    this.persist();
  }

  private read(): RecoveryState {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return { email: '', cooldownUntil: 0 };
      const parsed = JSON.parse(raw) as Partial<RecoveryState>;
      return {
        email: typeof parsed.email === 'string' ? parsed.email : '',
        cooldownUntil: typeof parsed.cooldownUntil === 'number' ? parsed.cooldownUntil : 0
      };
    } catch {
      return { email: '', cooldownUntil: 0 };
    }
  }

  private persist(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        email: this.emailState(),
        cooldownUntil: this.cooldownState()
      }));
    } catch {
      // sessionStorage puede estar bloqueado; el flujo funciona igual en memoria.
    }
  }
}
