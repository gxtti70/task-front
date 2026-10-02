import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { LucideAngularModule, Plus, Search, Bell, LogOut, CheckSquare, Layers, Folder, Menu, ChevronLeft, ChevronRight, Sliders, X, MoreHorizontal, ShieldAlert } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition }) => {
          if (document.hidden) {
            transition.skipTransition();
          }
          transition.finished.catch(() => {}); // Evita el unhandled rejection
        }
      })
    ),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    importProvidersFrom(
      LucideAngularModule.pick({
        Plus, Search, Bell, LogOut, CheckSquare, Layers, Folder, Menu, ChevronLeft, ChevronRight, Sliders, X, MoreHorizontal, ShieldAlert
      })
    )
  ]
};
