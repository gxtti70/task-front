import { expect, test } from '@playwright/test';

test('unknown paths show a titled not-found page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');
  await expect(page.getByRole('heading', { name: 'No encontramos esa página' })).toBeVisible();
  await expect(page).toHaveTitle('Página no encontrada | TaskManager');
});

test('protected routes preserve returnTo when redirecting to login', async ({ page }) => {
  await page.goto('/dashboard/kanban');
  await expect(page).toHaveURL(/\/auth\/login\?returnTo=%2Fdashboard%2Fkanban/);
});
