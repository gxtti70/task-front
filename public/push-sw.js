// Service worker para notificaciones push del chat.
// Se registra en el scope raíz para recibir push incluso con la pestaña cerrada.
// Versión 3: los mensajes se envían a ventanas abiertas y se muestran como push al quedar en segundo plano.

const SW_VERSION = 'v3';

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

  const notificationData = {
    channelId: data.channelId || '',
    messageId: data.messageId || '',
    senderName: data.senderName || '',
    timestamp: data.timestamp || Date.now()
  };

  const options = {
    body: data.body || 'Tienes un nuevo mensaje',
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    tag: 'chat-push',
    renotify: true,
    data: notificationData,
    actions: [
      { action: 'reply', title: 'Responder' },
      { action: 'open', title: 'Abrir chat' }
    ]
  };

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const message = {
      type: 'PUSH_MESSAGE',
      ...notificationData,
      title: data.title || 'Nuevo mensaje',
      body: data.body || 'Tienes un nuevo mensaje'
    };
    clients.forEach(client => client.postMessage(message));

    // Con la app visible mostramos una tarjeta propia que permite responder.
    // La notificación del sistema se reserva para cuando no hay una ventana visible.
    const hasVisibleClient = clients.some(client => client.visibilityState === 'visible');
    if (!hasVisibleClient) {
      return self.registration.showNotification(data.title || 'Nuevo mensaje', options);
    }
  }));
});

self.addEventListener('notificationclick', event => {
  console.log('[Push SW] notificationclick', event.action, event.notification.data);

  event.notification.close();

  const { channelId } = event.notification.data || {};
  const replyQuery = event.action === 'reply' ? '&reply=true' : '';
  const chatUrl = `/dashboard/chat?channelId=${encodeURIComponent(channelId || '')}${replyQuery}`;

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const client = clients[0];
    if (client) {
      await client.navigate(chatUrl);
      await client.focus();
      return;
    }
    await self.clients.openWindow(chatUrl);
  }));
});
