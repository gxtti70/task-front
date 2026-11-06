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
    // Suscribirse a push al iniciar la app (no solo al entrar al chat),
    // para recibir notificaciones desde cualquier sección como WhatsApp.
    const push = appRef.injector.get(PushNotificationService);
    void push.subscribe().then(subscribed => {
      if (subscribed) {
        console.log('Notificaciones push activadas al iniciar la app');
      }
    });
  })
  .catch((err) => console.error(err));