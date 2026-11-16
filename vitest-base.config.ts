import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    fileParallelism: false,
    // El código de la aplicación usa localStorage, sessionStorage y document.
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts']
  }
});
