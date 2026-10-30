import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-google-auth-callback',
  standalone: true,
  template: `
    <main class="flex min-h-dvh items-center justify-center bg-background px-4 text-sm text-zinc-300">
      <p>{{ message() }}</p>
    </main>
  `
})
export class GoogleAuthCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly message = signal('Verificando tu sesión de Google…');

  ngOnInit(): void {
    this.auth.loadProfile().subscribe({
      next: () => void this.router.navigateByUrl('/dashboard/kanban'),
      error: () => {
        this.message.set('No se pudo completar el acceso con Google.');
        this.toast.error('No se pudo completar el acceso con Google. Inténtalo de nuevo.');
        void this.router.navigateByUrl('/auth/login');
      }
    });
  }
}
