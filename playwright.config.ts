import { defineConfig } from '@playwright/test';
import { chromiumProject } from './test/e2e/playwright.config';

const baseURL = process.env.BASE_URL || process.env.E2E_ORIGIN;

export default defineConfig({
  testDir: './test/e2e',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  projects: [chromiumProject],
  use: {
    ...chromiumProject.use,
    trace: 'retain-on-failure',
    screenshot: 'on',
    baseURL,
  },
});
