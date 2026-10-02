import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4201',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome']
  },
  webServer: {
    command: 'npm run start -- --host 127.0.0.1 --port 4201 --proxy-config proxy.e2e.conf.json',
    url: 'http://127.0.0.1:4201/auth/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
