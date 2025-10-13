import { defineConfig } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv();

const baseURL = process.env.BASE_URL;

export default defineConfig({
  testDir: './test/e2e',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'on',
    baseURL,
  },
});
