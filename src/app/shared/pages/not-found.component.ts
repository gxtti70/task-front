import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <main class="error-page error-page--404">
      <div class="error-page__atmosphere" aria-hidden="true">
        <div class="error-page__orb"></div>
        <div class="error-page__grid"></div>
        <span class="error-page__code">404</span>
      </div>

      <section class="error-page__panel">
        <div class="error-page__brand">
          <span class="error-page__brand-mark">
            <lucide-icon name="layers" class="h-3.5 w-3.5"></lucide-icon>
          </span>
          TaskManager
        </div>

        <div class="error-page__icon">
          <lucide-icon name="file-question-mark" class="h-9 w-9"></lucide-icon>
        </div>

        <p class="error-page__badge">ERROR 404</p>
        <h1 class="error-page__title">Esta página se perdió en el tablero</h1>
        <p class="error-page__copy">
          La ruta no existe o se movió. Revisa el enlace o vuelve al inicio para retomar el hilo.
        </p>

        <div class="error-page__actions">
          <a routerLink="/" class="premium-primary-button">
            <lucide-icon name="home" class="h-4 w-4"></lucide-icon>
            Volver al inicio
          </a>
          <a routerLink="/dashboard/projects" class="premium-secondary-button">
            Ver proyectos
          </a>
        </div>
      </section>
    </main>
  `
})
export class NotFoundComponent {}
