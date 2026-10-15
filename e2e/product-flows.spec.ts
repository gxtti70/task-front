import { expect, test, type Page } from '@playwright/test';

const task = {
  id: 'task-1', title: 'Ship the release', description: 'Prepare release notes', status: 'TODO', priority: 'HIGH',
  storyPoints: 3, dueDate: null, assignee: { id: 'user-1', name: 'Test Manager', email: 'manager@example.test' },
  tags: ['release'], projectId: null, createdAt: '2026-01-01T00:00:00Z'
};

async function mockApplication(page: Page, role: 'MANAGER' | 'ADMIN', blockProjectCreation = false, authenticated = true): Promise<void> {
  const tokenPayload = btoa(JSON.stringify({ role: `ROLE_${role}` }));
  await page.addInitScript(({ token, user, authenticated: isAuthenticated }) => {
    if (!isAuthenticated) return;
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, {
    token: `header.${tokenPayload}.signature`,
    user: { id: 'user-1', fullName: 'Test User', name: 'Test User', role, email: `${role.toLowerCase()}@example.test` },
    authenticated
  });
  await page.route('**/api/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    let status = 200;
    let body: unknown = [];

    if (pathname.endsWith('/auth/login') && request.method() === 'POST') {
      body = { accessToken: `header.${btoa(JSON.stringify({ role: 'ROLE_MANAGER' }))}.signature`, refreshToken: 'test-refresh', userId: 'user-1', email: 'manager@example.test', role: 'MANAGER' };
    } else if (pathname.endsWith('/auth/me')) {
      body = { id: 'user-1', fullName: 'Test User', name: 'Test User', role, email: `${role.toLowerCase()}@example.test` };
    } else if (pathname.endsWith('/subscriptions/me')) {
      body = { tier: 'FREE', status: 'ACTIVE', cancelAtPeriodEnd: false, usage: { projects: 0, maxProjects: 3, membersPerProject: 1, maxMembersPerProject: 5 }, features: [], capabilities: { attachments: false } };
    } else if (pathname.endsWith('/tasks') && request.method() === 'GET') {
      body = [task];
    } else if (pathname.endsWith('/tasks/task-1/status') && request.method() === 'PATCH') {
      body = { ...task, status: request.postDataJSON().status };
    } else if (pathname.endsWith('/projects') && request.method() === 'POST' && blockProjectCreation) {
      status = 402;
      body = { message: 'Project limit reached' };
    }

    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

test('login reaches the protected task board', async ({ page }) => {
  await mockApplication(page, 'MANAGER', false, false);
  await page.goto('/auth/login');
  await page.locator('input[name="email"]').fill('manager@example.test');
  await page.locator('input[name="password"]').fill('local-password');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await expect(page).toHaveURL(/dashboard\/kanban/);
  await expect(page.getByRole('heading', { name: 'Sprint Active Backlog' })).toBeVisible();
});

test('tasks can move between Kanban columns with drag and drop', async ({ page }) => {
  await mockApplication(page, 'MANAGER');
  await page.goto('/dashboard/kanban');
  const card = page.locator('article[cdkdrag]').filter({ hasText: 'Ship the release' });
  await expect(card).toBeVisible();
  await card.dragTo(page.locator('#kanban-DONE'));
  await expect(card).toContainText('DONE');
});

test('project plan limits surface a useful error', async ({ page }) => {
  await mockApplication(page, 'MANAGER', true);
  await page.goto('/dashboard/projects');
  await page.getByRole('button', { name: 'Nuevo Proyecto' }).click();
  await page.locator('input[name="projectName"]').fill('Limit test');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('alert')).toContainText('Has alcanzado el límite de tu plan');
});

test('administrators can open user management', async ({ page }) => {
  await mockApplication(page, 'ADMIN');
  await page.goto('/dashboard/admin/users');
  await expect(page.getByRole('heading', { name: 'Gestión de Usuarios' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear usuario' })).toBeVisible();
});
