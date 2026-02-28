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

export const chromiumProject = {
  name: 'chromium',
  use: {
    launchOptions: { args: [...chromiumArgs, ...extraChromiumArgs] },
  },
};

export default defineConfig({
  projects: [chromiumProject],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
  },
});
