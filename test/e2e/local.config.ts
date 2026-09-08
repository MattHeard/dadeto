import { defineConfig } from '@playwright/test';

const apiBaseUrl = process.env.API_BASE_URL;
const extraChromiumArgs = apiBaseUrl
  ? [`--explicitly-allowed-ports=${new URL(apiBaseUrl).port}`]
  : [];

export default defineConfig({
  testDir: './local',
  testMatch: ['**/*.spec.ts'],
  workers: 1,
  projects: [
    {
      name: 'chromium',
      use: {
        channel: 'chromium',
        launchOptions: {
          args: [
            '--headless=new',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--use-gl=swiftshader',
            ...extraChromiumArgs,
          ],
        },
      },
    },
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL,
  },
});
