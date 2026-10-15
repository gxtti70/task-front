import { expect, test } from '@playwright/test';

test('signed-in user sees and dismisses the welcome announcement', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'e2e-access-token');
    localStorage.setItem('user', JSON.stringify({ id: 'welcome-e2e-user', email: 'welcome@example.test', role: 'MANAGER' }));
  });
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/subscriptions/me') return route.fulfill({ json: {
      tier: 'FREE', status: 'ACTIVE', cancelAtPeriodEnd: false,
      usage: { projects: 0, maxProjects: 3, membersPerProject: 1, maxMembersPerProject: 5 }, features: []
    } });
    if (url.pathname === '/api/announcements/pending') return route.fulfill({ json: [
      { key: 'welcome-e2e', title: 'Bienvenido a TaskManager', body: 'Organiza tu equipo desde un solo lugar.' }
    ] });
    if (url.pathname.endsWith('/dismiss')) return route.fulfill({ status: 204 });
    return route.fulfill({ json: [] });
  });

  await page.goto('/dashboard/kanban', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('dialog', { name: 'Bienvenido a TaskManager' })).toBeVisible();
  await page.getByRole('button', { name: 'Entendido' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('hasSeenWelcome_welcome-e2e-user'))).toBe('welcome-e2e');
});
