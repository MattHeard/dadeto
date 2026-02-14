import { test, expect } from '@playwright/test';

test('crop header screenshot', async ({ page }) => {
  await page.goto('https://mattheard.net', { waitUntil: 'networkidle' });

  // Take a screenshot of just the header area
  const header = page.locator('#container > div:first-child').first();
  await header.screenshot({ path: 'e2e-results/mattheard-header-crop.png' });
  
  console.log('Header screenshot saved');
});
