import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { PushNotificationService } from './app/core/services/push-notification.service';

// Registrar service worker de push lo antes posible (incluso antes de que se inyecte el servicio).
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
  void navigator.serviceWorker.register('/push-sw.js', { scope: '/' }).catch(err => {
    console.warn('Service worker push no se pudo registrar:', err);
  });
}

bootstrapApplication(AppComponent, appConfig)
  .then(appRef => {
    // Inicializa el registro y recupera suscripciones previas sin pedir permisos
    // antes de que el usuario active las notificaciones desde la interfaz.
    appRef.injector.get(PushNotificationService);
  })
  .catch((err) => console.error(err));
