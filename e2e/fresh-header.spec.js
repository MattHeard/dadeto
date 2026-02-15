import { test } from '@playwright/test';

test('fresh header screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1080 });
  await page.goto('https://mattheard.net', { waitUntil: 'networkidle' });

  const entry = page.locator('#container > .entry').first();
  await entry.screenshot({ path: 'e2e-results/header-fresh.png' });
  
  console.log('\nHeader structure:');
  const children = await entry.locator('> *').count();
  console.log(`Total child elements in .entry: ${children}`);
  
  const keys = await entry.locator('> .key').count();
  const values = await entry.locator('> .value').count();
  console.log(`Keys: ${keys}, Values: ${values}`);
});
