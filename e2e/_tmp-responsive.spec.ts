import { expect, test, type Page } from '@playwright/test';

const task = {
  id: 'task-1', title: 'Ship the release', description: 'Prepare release notes', status: 'TODO', priority: 'HIGH',
  storyPoints: 3, dueDate: null, assignee: { id: 'user-1', name: 'Test Manager', email: 'manager@example.test' },
  tags: ['release'], projectId: null, createdAt: '2026-01-01T00:00:00Z'
};

async function mockApplication(page: Page): Promise<void> {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    let status = 200;
    let body: unknown = [];

    if (pathname.endsWith('/auth/csrf') && request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'e2e-csrf-token' });
      return;
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())
        && !request.headers()['x-xsrf-token']) {
      await route.fulfill({ status: 403, json: { code: 'CSRF_INVALID' } });
      return;
    }

    if (pathname.endsWith('/auth/me')) {
      body = { id: 'user-1', fullName: 'Test User', name: 'Test User', role: 'MANAGER', email: 'manager@example.test' };
    } else if (pathname.endsWith('/subscriptions/me')) {
      body = { tier: 'FREE', status: 'ACTIVE', cancelAtPeriodEnd: false, usage: { projects: 0, maxProjects: 3, membersPerProject: 1, maxMembersPerProject: 5 }, features: [], capabilities: { attachments: false } };
    } else if (pathname.endsWith('/tasks') && request.method() === 'GET') {
      body = [task];
    } else if (pathname.endsWith('/tasks/task-1/status') && request.method() === 'PATCH') {
      body = { ...task, status: request.postDataJSON().status };
    } else if (pathname.endsWith('/projects') && request.method() === 'GET') {
      body = [];
    } else if (pathname.endsWith('/notifications')) {
      body = [];
    }

    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

for (const [width, height] of [[320, 640], [375, 812], [768, 1024], [1280, 800]] as const) {
  test(`no horizontal overflow at ${width}x${height}`, async ({ page }) => {
    await mockApplication(page);
    await page.setViewportSize({ width, height });
    await page.goto('/dashboard/kanban');
    await expect(page.getByRole('heading', { name: 'Sprint Active Backlog' })).toBeVisible();
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
  });
}

test('mobile drawer opens and closes', async ({ page }) => {
  await mockApplication(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard/kanban');
  const menu = page.getByRole('button', { name: 'Abrir menú' });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.getByRole('link', { name: 'Tablero Kanban' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar menú' }).click();
  await expect(page.locator('app-sidebar > div')).toHaveClass(/-translate-x-full/);
});

test('favicon and manifest are served', async ({ request }) => {
  for (const path of ['/favicon.svg', '/favicon-32.png', '/favicon.ico', '/apple-touch-icon.png', '/site.webmanifest', '/icon-192.png']) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
  }
});

test('mobile filters collapse behind a toggle', async ({ page }) => {
  await mockApplication(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard/kanban');
  const toggle = page.getByRole('button', { name: /Filtros/ });
  await expect(toggle).toBeVisible();
  const grid = page.locator('#kanban-filters');
  await expect(grid).toBeHidden();
  await toggle.click();
  await expect(grid).toBeVisible();
  await page.locator('select[name="priorityFilter"]').selectOption('HIGH');
  await expect(toggle).toContainText('1');
  await page.screenshot({ path: '/tmp/opencode/shots/kanban-filters-375.png' });
  await toggle.click();
  await expect(grid).toBeHidden();
});

test('desktop shows filters inline with no toggle', async ({ page }) => {
  await mockApplication(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dashboard/kanban');
  await expect(page.locator('#kanban-filters')).toBeVisible();
  await expect(page.getByRole('button', { name: /Filtros/ })).toBeHidden();
});

test('capture responsive screenshots', async ({ page }) => {
  await mockApplication(page);
  for (const [w, h] of [[320, 640], [375, 812], [768, 1024]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/dashboard/kanban');
    await expect(page.getByRole('heading', { name: 'Sprint Active Backlog' })).toBeVisible();
    await page.screenshot({ path: `/tmp/opencode/shots/kanban-${w}.png`, fullPage: false });
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.waitForTimeout(350);
    await page.screenshot({ path: `/tmp/opencode/shots/drawer-${w}.png`, fullPage: false });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dashboard/kanban');
  await expect(page.getByRole('heading', { name: 'Sprint Active Backlog' })).toBeVisible();
  await page.screenshot({ path: '/tmp/opencode/shots/kanban-1280.png' });
});
