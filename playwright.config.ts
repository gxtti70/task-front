import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  // El dev server compila rutas bajo demanda (~24s o más en la primera navegación);
  // 30s no alcanza de forma consistente.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:4201',
    trace: 'retain-on-failure',
    navigationTimeout: 60_000,
    ...devices['Desktop Chrome']
  },
  webServer: {
    command: 'npm run start -- --host 127.0.0.1 --port 4201 --proxy-config proxy.e2e.conf.json',
    url: 'http://127.0.0.1:4201/auth/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
