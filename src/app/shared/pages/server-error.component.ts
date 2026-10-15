import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <main class="error-page error-page--500">
      <div class="error-page__atmosphere" aria-hidden="true">
        <div class="error-page__orb"></div>
        <div class="error-page__grid"></div>
        <span class="error-page__code">500</span>
      </div>

      <section class="error-page__panel">
        <div class="error-page__brand">
          <span class="error-page__brand-mark">
            <lucide-icon name="layers" class="h-3.5 w-3.5"></lucide-icon>
          </span>
          TaskManager
        </div>

        <div class="error-page__icon">
          <lucide-icon name="server-crash" class="h-9 w-9"></lucide-icon>
        </div>

        <p class="error-page__badge">ERROR 500</p>
        <h1 class="error-page__title">Algo se rompió del lado del servidor</h1>
        <p class="error-page__copy">
          Ocurrió un fallo inesperado. Espera un momento e inténtalo otra vez; si continúa, avísanos.
        </p>

        <div class="error-page__actions">
          <button type="button" class="premium-primary-button" (click)="reload()">
            Reintentar
          </button>
          <a routerLink="/" class="premium-secondary-button">
            <lucide-icon name="home" class="h-4 w-4"></lucide-icon>
            Ir al inicio
          </a>
        </div>
      </section>
    </main>
  `
})
export class ServerErrorComponent {
  reload(): void {
    window.location.reload();
  }
}
