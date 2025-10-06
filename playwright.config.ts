import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'on',
  },
});
