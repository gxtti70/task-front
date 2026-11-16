import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PasswordRecoveryService } from '../../core/services/password-recovery.service';
import { ToastService } from '../../core/services/toast.service';
import { OtpInputComponent } from './otp-input.component';
import { LucideAngularModule } from 'lucide-angular';

type RecoveryStep = 'email' | 'code' | 'password';

/**
 * Recuperación de contraseña en tres pasos: correo, código de 6 dígitos y nueva contraseña.
 *
 * <p>El código se pide en el paso 2 y se valida en el paso 3 junto con la contraseña,
 * de forma que un solo envío resuelve la recuperación.
 */
@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, OtpInputComponent],
  template: `
    <div class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,0.5),transparent)] pointer-events-none"></div>

      <div class="w-full max-w-md bg-zinc-900/50 border border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-2xl glass-panel animate-slide-in">
        <div class="flex flex-col items-center mb-6">
          <div class="h-10 w-10 bg-white rounded-lg flex items-center justify-center mb-3 shadow-md">
            <lucide-icon name="layers" class="text-black h-5 w-5"></lucide-icon>
          </div>
          <h1 class="text-2xl font-semibold tracking-tight text-white">Recuperar contraseña</h1>
          <p class="text-sm text-zinc-400 mt-1">{{ subtitle() }}</p>
        </div>

        <ol class="mb-7 flex items-center gap-2" aria-label="Progreso de la recuperación">
          @for (item of steps; track item.key) {
            <li class="flex items-center gap-2">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium transition-colors"
                [class.border-white]="isDone(item.key)"
                [class.bg-white]="isDone(item.key)"
                [class.text-black]="isDone(item.key)"
                [class.border-zinc-700]="!isDone(item.key)"
                [class.text-zinc-500]="!isDone(item.key)">
                {{ order(item.key) }}
              </span>
              <span class="text-[11px] uppercase tracking-wider whitespace-nowrap"
                [class.text-zinc-200]="step() === item.key"
                [class.text-zinc-600]="step() !== item.key">{{ item.label }}</span>
            </li>
            @if (!$last) {
              <span class="h-px flex-1 bg-zinc-800"></span>
            }
          }
        </ol>

        @switch (step()) {
          @case ('email') {
            <form (ngSubmit)="onRequestCode()" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" name="email" [(ngModel)]="email" placeholder="usuario@empresa.com"
                  autocomplete="email"
                  class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors" required>
              </div>

              <p class="text-xs leading-relaxed text-zinc-500">
                Te enviamos un código de 6 dígitos. Si el correo no está registrado, no recibirás ningún mensaje.
              </p>

              <button type="submit" [disabled]="isLoading()"
                class="w-full bg-white hover:bg-zinc-200 text-black text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                @if (isLoading()) {
                  <div class="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                } @else {
                  Enviar código
                }
              </button>
            </form>
          }

          @case ('code') {
            <div class="space-y-5">
              <p class="text-sm text-zinc-400 text-center leading-relaxed">
                Introduce el código de 6 dígitos que enviamos a<br>
                <span class="text-zinc-200 font-medium break-all">{{ email }}</span>
              </p>

              <app-otp-input (codeChange)="onCodeEntered($event)"></app-otp-input>

              <div class="flex items-center justify-between gap-3 text-xs">
                <button type="button" (click)="backToEmail()"
                  class="text-zinc-500 hover:text-zinc-300 transition-colors">← Cambiar correo</button>
                <button type="button" (click)="onResend()" [disabled]="countdown() > 0 || isLoading()"
                  class="text-zinc-400 hover:text-zinc-200 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors">
                  @if (countdown() > 0) {
                    Reenviar en {{ countdown() }}s
                  } @else {
                    Reenviar código
                  }
                </button>
              </div>

              <button type="button" (click)="onContinueWithCode()" [disabled]="code.length !== 6"
                class="w-full bg-white hover:bg-zinc-200 text-black text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Continuar
              </button>
            </div>
          }

          @case ('password') {
            <form (ngSubmit)="onResetPassword()" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5">Nueva contraseña</label>
                <input type="password" name="password" [(ngModel)]="password" placeholder="••••••••"
                  autocomplete="new-password" minlength="6"
                  class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors" required>
              </div>

              <div>
                <label class="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5">Confirmar contraseña</label>
                <input type="password" name="confirmPassword" [(ngModel)]="confirmPassword" placeholder="••••••••"
                  autocomplete="new-password" minlength="6"
                  class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors" required>
              </div>

              <button type="submit" [disabled]="isLoading()"
                class="w-full bg-white hover:bg-zinc-200 text-black text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                @if (isLoading()) {
                  <div class="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                } @else {
                  Actualizar contraseña
                }
              </button>

              <button type="button" (click)="step.set('code')"
                class="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                ← Volver al código
              </button>
            </form>
          }
        }

        <div class="mt-6 text-center">
          <a routerLink="/auth/login" class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Volver al login
          </a>
        </div>
      </div>
    </div>
  `
})
export class RecoverPasswordComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private recovery = inject(PasswordRecoveryService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly steps: { key: RecoveryStep; label: string }[] = [
    { key: 'email', label: 'Correo' },
    { key: 'code', label: 'Código' },
    { key: 'password', label: 'Contraseña' }
  ];

  readonly step = signal<RecoveryStep>('email');
  readonly isLoading = signal(false);
  readonly countdown = signal(0);

  email = '';
  code = '';
  password = '';
  confirmPassword = '';

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const stored = this.recovery.email();
    if (stored) {
      this.email = stored;
      this.step.set('code');
      this.startCountdown();
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  subtitle(): string {
    switch (this.step()) {
      case 'email': return 'Te enviamos un código para restablecer tu acceso';
      case 'code': return 'Revisa tu correo y escribe el código recibido';
      case 'password': return 'Elige la contraseña que quieres usar';
    }
  }

  order(key: RecoveryStep): number {
    return this.steps.findIndex(item => item.key === key) + 1;
  }

  isDone(key: RecoveryStep): boolean {
    return this.order(key) < this.order(this.step());
  }

  onRequestCode(): void {
    const email = this.email.trim();
    if (!email) {
      this.toast.error('Ingresa tu correo para continuar.', 'Faltan datos');
      return;
    }

    this.isLoading.set(true);
    this.authService.requestRecoveryCode(email).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.email = email;
        this.recovery.setEmail(email);
        this.recovery.setCooldown(response.resendAvailableInSeconds);
        this.step.set('code');
        this.startCountdown();
        this.toast.success(response.message, 'Código enviado');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.errorFor(err, 'No se pudo enviar el código de verificación.');
      }
    });
  }

  onResend(): void {
    if (!this.recovery.canResend()) return;
    this.onRequestCode();
  }

  onCodeEntered(value: string): void {
    this.code = value;
  }

  onContinueWithCode(): void {
    if (this.code.length !== 6) {
      this.toast.error('Introduce los 6 dígitos del código.', 'Código incompleto');
      return;
    }
    this.step.set('password');
  }

  onResetPassword(): void {
    if (!this.email) {
      this.backToEmail();
      return;
    }
    if (this.password.length < 6) {
      this.toast.error('La contraseña debe tener al menos 6 caracteres.', 'Contraseña débil');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.toast.error('Verifica que las contraseñas coincidan.', 'No coinciden');
      return;
    }

    this.isLoading.set(true);
    this.authService.resetPasswordWithCode(this.email, this.code, this.password).subscribe({
      next: (message) => {
        this.isLoading.set(false);
        this.recovery.clear();
        this.toast.success(message, 'Contraseña actualizada');
        void this.router.navigateByUrl('/auth/login');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.errorFor(err, 'No se pudo actualizar la contraseña.');
      }
    });
  }

  backToEmail(): void {
    this.step.set('email');
    this.code = '';
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.countdown.set(this.recovery.remainingSeconds());
    this.timer = setInterval(() => {
      const remaining = this.recovery.remainingSeconds();
      this.countdown.set(remaining);
      if (remaining <= 0) this.stopCountdown();
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
