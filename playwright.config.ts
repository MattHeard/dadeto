import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || process.env.E2E_ORIGIN,
    trace: 'retain-on-failure',
    screenshot: 'on',
  },
});
