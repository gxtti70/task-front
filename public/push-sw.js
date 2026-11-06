// Service worker para notificaciones push del chat.
// Se registra en el scope raíz para recibir push incluso con la pestaña cerrada.

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {
    title: 'Nuevo mensaje',
    body: '',
    channelId: ''
  };

  const options = {
    body: data.body || '',
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

  event.waitUntil(self.registration.showNotification(data.title || 'Nuevo mensaje', options));
});

self.addEventListener('notificationclick', event => {
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
