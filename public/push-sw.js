// Service worker para notificaciones push del chat.
// Se registra en el scope raíz para recibir push incluso con la pestaña cerrada.
// Versión 2: payload JSON plano (sin cifrado), evento de respuesta desde notificación.

const SW_VERSION = 'v2';
const CACHE_NAME = `push-sw-${SW_VERSION}`;

self.addEventListener('install', event => {
  console.log(`[Push SW ${SW_VERSION}] install`);
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log(`[Push SW ${SW_VERSION}] activate`);
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  console.log('[Push SW] push event received', event.data ? 'has data' : 'no data');

  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    console.warn('[Push SW] error parsing push data:', err);
    data = {};
  }

  const options = {
    body: data.body || 'Tienes un nuevo mensaje',
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    tag: 'chat-push',
    renotify: true,
    data: {
      channelId: data.channelId || '',
      messageId: data.messageId || '',
      senderName: data.senderName || '',
      timestamp: data.timestamp || 0
    },
    actions: [
      { action: 'reply', title: 'Responder' },
      { action: 'open', title: 'Abrir chat' }
    ]
  };

  console.log('[Push SW] showing notification:', data.title || 'Nuevo mensaje');

  event.waitUntil(self.registration.showNotification(data.title || 'Nuevo mensaje', options));
});

self.addEventListener('notificationclick', event => {
  console.log('[Push SW] notificationclick', event.action, event.notification.data);

  event.notification.close();

  const { channelId } = event.notification.data || {};
  const action = event.action;
  const replyText = event.replyText || '';

  const handleClients = (fn) => {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(fn);
      })
    );
  };

  if (action === 'reply' && replyText) {
    // El usuario respondió desde la notificación: reenviar el texto al cliente de la app
    handleClients(client => {
      client.postMessage({
        type: 'PUSH_REPLY',
        channelId: channelId || '',
        text: replyText
      });
    });
  } else {
    // Abrir/enfocar el chat
    handleClients(client => {
      if (client.url.includes('/dashboard/chat')) {
        client.focus();
        client.postMessage({
          type: 'PUSH_OPEN_CHANNEL',
          channelId: channelId || ''
        });
      }
    }).then(() => {
      // Si no hay cliente de chat abierto, abrir una nueva ventana
      event.waitUntil(
        self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
          const hasChat = clients.some(c => c.url.includes('/dashboard/chat'));
          if (!hasChat) {
            self.clients.openWindow('/dashboard/chat');
          }
        })
      );
    });
  }
});
