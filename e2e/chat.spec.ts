import { expect, test, type Page } from '@playwright/test';

const room = { id: 'c-room', type: 'TEXT', name: 'Sala General', projectId: 'p-1', createdAt: '2026-01-01T00:00:00Z' };
const direct = { id: 'c-dm', type: 'TEXT', name: null, projectId: null, otherUserId: 'user-2', otherUserName: 'Ana Directa', createdAt: '2026-01-01T00:00:00Z' };

const selfUser = { id: 'user-1', fullName: 'Test Manager', email: 'manager@example.test', role: 'MANAGER' };
const otherUser = { id: 'user-2', fullName: 'Ana Directa', email: 'ana@example.test', role: 'DEVELOPER' };

const project = {
  id: 'p-1', name: 'Roadmap', status: 'ACTIVE', tasksCount: 0, membersCount: 2,
  ownerId: 'user-1', createdAt: '2026-01-01T00:00:00Z'
};

function messageOf(id: string, body: string, authorId: string): object {
  return {
    id, body, authorId,
    authorName: authorId === 'user-1' ? 'Test Manager' : 'Ana Directa',
    authorEmail: authorId === 'user-1' ? 'manager@example.test' : 'ana@example.test',
    createdAt: '2026-01-02T10:00:00Z'
  };
}

const longMessage = `sd${'f'.repeat(220)}`;

let nextMessageId = 100;

async function mockApplication(page: Page): Promise<void> {
  const messageStore = new Map<string, object[]>([
    ['c-room', [messageOf('m-1', 'Bienvenida a la sala', 'user-2')]],
    ['c-dm', [
      messageOf('m-2', '¿Cómo va la tarea?', 'user-2'),
      messageOf('m-3', 'Bien, casi lista', 'user-1'),
      messageOf('m-long', longMessage, 'user-1')
    ]]
  ]);
  const channels = [room, direct];

  await page.route('**/api/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    let status = 200;
    let body: unknown = [];

    if (pathname.endsWith('/auth/csrf') && request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'chat-csrf-token' });
      return;
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())
        && !request.headers()['x-xsrf-token']) {
      await route.fulfill({ status: 403, json: { code: 'CSRF_INVALID' } });
      return;
    }

    if (pathname.endsWith('/auth/me')) {
      body = selfUser;
    } else if (pathname.endsWith('/subscriptions/me')) {
      body = { tier: 'FREE', status: 'ACTIVE', cancelAtPeriodEnd: false, usage: { projects: 1, maxProjects: 3, membersPerProject: 1, maxMembersPerProject: 5 }, features: [], capabilities: { attachments: false } };
    } else if (pathname.endsWith('/users')) {
      body = [selfUser, otherUser];
    } else if (pathname.endsWith('/presence') && request.method() === 'GET') {
      // Ana está desconectada y su última conexión fue hace 5 minutos.
      body = {
        'user-1': { status: 'AVAILABLE', lastSeenAt: new Date(Date.now() - 60_000).toISOString() },
        'user-2': { status: 'OFFLINE', lastSeenAt: new Date(Date.now() - 5 * 60_000).toISOString() }
      };
    } else if (pathname.endsWith('/projects')) {
      body = [project];
    } else if (pathname.endsWith('/channels/direct') && request.method() === 'POST') {
      const payload = request.postDataJSON() as { memberId: string };
      // El backend es idempotente: 200 si ya existe un DM con esa persona, 201 si es nuevo.
      const name = payload.memberId === 'user-2' ? 'Ana Directa' : 'Vecino';
      const existing = channels.find(channel => channel.projectId === null && channel.otherUserId === payload.memberId);
      body = existing ?? { id: `c-dm-${payload.memberId}`, type: 'TEXT', name: null, projectId: null, otherUserId: payload.memberId, otherUserName: name, createdAt: '2026-01-01T00:00:00Z' };
      status = existing ? 200 : 201;
      if (!existing) {
        channels.unshift(body as typeof direct);
        messageStore.set((body as typeof direct).id, []);
      }
    } else if (pathname.endsWith('/channels') && request.method() === 'POST') {
      const payload = request.postDataJSON() as { projectId: string; name: string };
      const created = { ...room, id: `c-room-new`, name: payload.name, projectId: payload.projectId };
      channels.unshift(created);
      messageStore.set(created.id, []);
      status = 201;
      body = created;
    } else if (pathname.endsWith('/channels')) {
      body = channels;
    } else if (pathname.includes('/messages') && request.method() === 'POST') {
      const parts = pathname.split('/');
      const channelId = parts[parts.indexOf('channels') + 1];
      const payload = request.postDataJSON() as { body: string };
      const created = messageOf(`m-${nextMessageId++}`, payload.body, 'user-1');
      messageStore.get(channelId)?.push(created);
      status = 201;
      body = created;
    } else if (pathname.includes('/messages')) {
      const parts = pathname.split('/');
      const channelId = parts[parts.indexOf('channels') + 1];
      body = messageStore.get(channelId) ?? [];
    }

    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

test('el chat lista canales, abre un DM y envía mensajes', async ({ page }) => {
  await mockApplication(page);
  await page.goto('/dashboard/chat');

  // La lista muestra la sala y el DM
  await expect(page.getByRole('button', { name: 'Sala General' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ana Directa' })).toBeVisible();

  // Abrir el DM carga su historial
  await page.getByRole('button', { name: 'Ana Directa' }).click();
  await expect(page.getByText('¿Cómo va la tarea?')).toBeVisible();
  await expect(page.getByText('Bien, casi lista')).toBeVisible();

  // Enviar un mensaje lo añade a la conversación
  await page.getByRole('textbox', { name: 'Escribe un mensaje' }).fill('Ya quedó');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByText('Ya quedó')).toBeVisible();
});

test('los mensajes largos sin espacios no desbordan la columna', async ({ page }) => {
  await mockApplication(page);
  await page.goto('/dashboard/chat');
  await page.getByRole('button', { name: 'Ana Directa' }).click();

  const list = page.locator('.chat-messages-list');
  const bubble = page.locator('.chat-message-bubble.is-mine').filter({ hasText: 'sdffff' });
  await expect(bubble).toBeVisible();

  const listBox = await list.boundingBox();
  const bubbleBox = await bubble.boundingBox();
  expect(listBox).not.toBeNull();
  expect(bubbleBox).not.toBeNull();
  if (!listBox || !bubbleBox) return;

  expect(bubbleBox.width).toBeLessThanOrEqual(listBox.width * 0.75 + 1);
  expect(await list.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  // Una sola línea mediría ~40px; varias líneas confirman que la cadena se partió.
  expect(bubbleBox.height).toBeGreaterThan(60);
});

test('crear una sala de proyecto desde el diálogo la deja activa', async ({ page }) => {
  await mockApplication(page);
  await page.goto('/dashboard/chat');

  await page.getByRole('button', { name: 'Nueva conversación' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.locator('select[name="roomProject"]').selectOption({ label: 'Roadmap' });
  await dialog.locator('input[name="roomName"]').fill('Diseño QA');
  await dialog.getByRole('button', { name: 'Crear sala' }).click();

  const roomButton = page.getByRole('button', { name: 'Diseño QA' });
  await expect(roomButton).toBeVisible();
  await roomButton.click();
  await expect(page.getByText('Aún no hay mensajes. Estrena la conversación…')).toBeVisible();
});

test('se puede iniciar un mensaje directo desde el listado de usuarios', async ({ page }) => {
  await mockApplication(page);
  await page.goto('/dashboard/chat');

  await page.getByRole('button', { name: 'Nueva conversación' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Mensaje directo' }).click();
  await dialog.locator('input[name="dmSearch"]').fill('Ana');
  await dialog.getByRole('button', { name: /Ana Directa/ }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('¿Cómo va la tarea?')).toBeVisible();
});

test('el DM muestra la última conexión de la otra persona', async ({ page }) => {
  await mockApplication(page);
  await page.goto('/dashboard/chat');
  await page.getByRole('button', { name: 'Ana Directa' }).click();

  // En la cabecera del DM: "Desconectado · última vez conectado hace 5 min".
  await expect(page.getByText(/última vez conectado hace 5 min/).first()).toBeVisible();

  // En la lista de conversaciones, con la fecha exacta como tooltip.
  const item = page.getByRole('button', { name: 'Ana Directa' });
  await expect(item.getByText('hace 5 min')).toBeVisible();
  await expect(item.locator('[title^="Última conexión:"]')).toHaveCount(1);
});
