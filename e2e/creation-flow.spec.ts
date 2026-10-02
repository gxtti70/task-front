import { expect, test, type Page } from '@playwright/test';

const password = process.env.E2E_PASSWORD ?? 'Local-Test-123';
const managerEmail = process.env.E2E_MANAGER_EMAIL ?? 'e2e-manager@example.test';
const developerEmail = process.env.E2E_DEVELOPER_EMAIL ?? 'e2e-developer@example.test';

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await expect(page).toHaveURL(/dashboard\/kanban/);
}

test('manager creates a project and links a task to it', async ({ page }) => {
  const suffix = Date.now();
  const projectName = `E2E project ${suffix}`;
  const taskTitle = `E2E task ${suffix}`;

  await login(page, managerEmail);
  await page.goto('/dashboard/projects', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Nuevo Proyecto' }).click();
  await page.locator('input[name="projectName"]').fill(projectName);
  await page.locator('textarea[name="projectDescription"]').fill('Browser integration test project');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

  await page.goto('/dashboard/kanban', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Crear tarea' }).click();
  await page.locator('input[name="title"]').fill(taskTitle);
  await page.locator('textarea[name="description"]').fill('Created through the browser flow');
  await page.locator('select[name="projectId"]').selectOption({ label: projectName });
  await page.getByRole('button', { name: 'Crear Item' }).click();
  await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible();

  await page.goto('/dashboard/projects', { waitUntil: 'domcontentloaded' });
  const projectCard = page.locator('article').filter({ has: page.getByRole('heading', { name: projectName }) });
  await expect(projectCard).toContainText('1 tareas');
});

test('developer cannot access project or task creation actions', async ({ page }) => {
  await login(page, developerEmail);
  await page.goto('/dashboard/projects', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Nuevo Proyecto' })).toHaveCount(0);

  await page.goto('/dashboard/kanban', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Crear tarea' })).toHaveCount(0);
});
