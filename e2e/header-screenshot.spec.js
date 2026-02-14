import { test } from '@playwright/test';

test('capture header screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1080 });
  await page.goto('https://mattheard.net', { waitUntil: 'networkidle' });

  const container = page.locator('#container');
  await container.screenshot({ path: 'e2e-results/header-current.png', maxWidth: 1280 });
});
