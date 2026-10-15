import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <main class="error-page error-page--403">
      <div class="error-page__atmosphere" aria-hidden="true">
        <div class="error-page__orb"></div>
        <div class="error-page__grid"></div>
        <span class="error-page__code">403</span>
      </div>

      <section class="error-page__panel">
        <div class="error-page__brand">
          <span class="error-page__brand-mark">
            <lucide-icon name="layers" class="h-3.5 w-3.5"></lucide-icon>
          </span>
          TaskManager
        </div>

        <div class="error-page__icon">
          <lucide-icon name="shield-x" class="h-9 w-9"></lucide-icon>
        </div>

        <p class="error-page__badge">ERROR 403</p>
        <h1 class="error-page__title">Esta zona está fuera de tu alcance</h1>
        <p class="error-page__copy">
          Tu cuenta no tiene permisos para ver este contenido. Si crees que es un error, pide acceso a un administrador.
        </p>

        <div class="error-page__actions">
          <a routerLink="/" class="premium-primary-button">
            <lucide-icon name="home" class="h-4 w-4"></lucide-icon>
            Volver al inicio
          </a>
          <a routerLink="/dashboard/kanban" class="premium-secondary-button">
            Ir al tablero
          </a>
        </div>
      </section>
    </main>
  `
})
export class ForbiddenComponent {}
