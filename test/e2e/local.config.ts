import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './local',
  testMatch: ['**/*.spec.ts'],
  projects: [
    {
      name: 'chromium',
    },
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL,
  },
});
