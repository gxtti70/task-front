import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom, ErrorHandler } from '@angular/core';
import { provideRouter, withViewTransitions, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { GlobalErrorHandler } from './core/services/global-error-handler';
import { LucideAngularModule, Plus, Search, Bell, Settings, UserRound, LogOut, CheckSquare, Layers, Folder, ChevronLeft, ChevronRight, Sliders, X, ShieldAlert, CreditCard, Sparkles, Check, Crown, Star, Paperclip, Download, Trash2, Upload, FolderPlus, FileQuestionMark, ShieldX, ServerCrash, Home, Lock } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
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
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    importProvidersFrom(
      LucideAngularModule.pick({
        Plus, Search, Bell, Settings, UserRound, LogOut, CheckSquare, Layers, Folder, ChevronLeft, ChevronRight, Sliders, X, ShieldAlert, CreditCard, Sparkles, Check, Crown, Star, Paperclip, Download, Trash2, Upload, FolderPlus, FileQuestionMark, ShieldX, ServerCrash, Home, Lock
      })
    )
  ]
};
