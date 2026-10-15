import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background px-4">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,0.5),transparent)] pointer-events-none"></div>

      <div class="w-full max-w-md bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl shadow-2xl glass-panel animate-slide-in">
        <div class="flex flex-col items-center mb-8">
          <div class="h-10 w-10 bg-white rounded-lg flex items-center justify-center mb-3 shadow-md">
            <lucide-icon name="layers" class="text-black h-5 w-5"></lucide-icon>
          </div>
          <h1 class="text-2xl font-semibold tracking-tight text-white">Nueva contraseña</h1>
          <p class="text-sm text-zinc-400 mt-1">Crea una contraseña para tu cuenta</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5">Contraseña</label>
            <input type="password" name="password" [(ngModel)]="password" placeholder="••••••••"
              class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors" required minlength="6">
          </div>

          <div>
            <label class="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5">Confirmar contraseña</label>
            <input type="password" name="confirmPassword" [(ngModel)]="confirmPassword" placeholder="••••••••"
              class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors" required minlength="6">
          </div>

          <button type="submit" [disabled]="isLoading()"
            class="w-full bg-white hover:bg-zinc-200 text-black text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6">
            @if (isLoading()) {
              <div class="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            } @else {
              Actualizar contraseña
            }
          </button>
        </form>

        <div class="mt-6 text-center">
          <a routerLink="/auth/login" class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Volver al login
          </a>
        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  token = '';
  password = '';
  confirmPassword = '';
  isLoading = signal(false);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.toast.error('Enlace inválido', 'Token no proporcionado');
    }
  }

  onSubmit(): void {
    if (!this.token) {
      this.toast.error('Enlace inválido', 'Token no proporcionado');
      return;
    }
    if (this.password.length < 6) {
      this.toast.error('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.toast.error('Verifica', 'Las contraseñas no coinciden');
      return;
    }

    this.isLoading.set(true);
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: (msg) => {
        this.isLoading.set(false);
        this.toast.success(msg, 'Contraseña actualizada');
        void this.router.navigateByUrl('/auth/login');
      },
      error: (err) => {
        this.toast.errorFor(err, 'No se pudo actualizar la contraseña.');
        this.isLoading.set(false);
      }
    });
  }
}
