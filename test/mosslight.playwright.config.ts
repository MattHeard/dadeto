import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './mosslight-e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173', headless: true },
  projects: [
    {
      name: 'phone',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node mosslight-e2e/server.mjs',
    url: 'http://127.0.0.1:4173/mosslight-valley/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
