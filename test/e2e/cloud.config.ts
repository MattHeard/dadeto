import { defineConfig } from '@playwright/test';

const chromiumArgs = [
  '--headless=new',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--use-gl=swiftshader',
];

const extraChromiumArgs = (process.env.CHROMIUM_EXTRA_ARGS || '')
  .split(' ')
  .filter(Boolean);

const apiBaseUrl = process.env.API_BASE_URL;
const allowedPorts = apiBaseUrl
  ? new Set(
      [
        new URL(apiBaseUrl).port,
        new URL(
          process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL ?? apiBaseUrl
        ).port,
      ].filter(Boolean)
    )
  : new Set();

if (allowedPorts.size > 0) {
  extraChromiumArgs.push(
    `--explicitly-allowed-ports=${[...allowedPorts].join(',')}`
  );
}

export default defineConfig({
  testDir: '.',
  testMatch: [
    '**/api-key-credit-v2.spec.ts',
    '**/dendrite-fixture.spec.ts',
    '**/new-story.spec.ts',
    '**/payment-webhook.spec.ts',
  ],
  projects: [
    {
      name: 'chromium',
      use: {
        launchOptions: { args: [...chromiumArgs, ...extraChromiumArgs] },
      },
    },
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL,
  },
});
