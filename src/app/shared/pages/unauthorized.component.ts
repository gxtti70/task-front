import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <main class="error-page error-page--401">
      <div class="error-page__atmosphere" aria-hidden="true">
        <div class="error-page__orb"></div>
        <div class="error-page__grid"></div>
        <span class="error-page__code">401</span>
      </div>

      <section class="error-page__panel">
        <div class="error-page__brand">
          <span class="error-page__brand-mark">
            <lucide-icon name="layers" class="h-3.5 w-3.5"></lucide-icon>
          </span>
          TaskManager
        </div>

        <div class="error-page__icon">
          <lucide-icon name="lock" class="h-9 w-9"></lucide-icon>
        </div>

        <p class="error-page__badge">ERROR 401</p>
        <h1 class="error-page__title">Tu sesión necesita volver a empezar</h1>
        <p class="error-page__copy">
          No hay una sesión activa o el acceso expiró. Entra de nuevo para seguir trabajando en tus proyectos.
        </p>

        <div class="error-page__actions">
          <a routerLink="/auth/login" class="premium-primary-button">
            <lucide-icon name="lock" class="h-4 w-4"></lucide-icon>
            Iniciar sesión
          </a>
          <a routerLink="/" class="premium-secondary-button">
            <lucide-icon name="home" class="h-4 w-4"></lucide-icon>
            Ir al inicio
          </a>
        </div>
      </section>
    </main>
  `
})
export class UnauthorizedComponent {}
