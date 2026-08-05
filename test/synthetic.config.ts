import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './synthetic',
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
          ],
        },
      },
    },
  ],
});
