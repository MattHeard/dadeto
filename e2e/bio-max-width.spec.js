import { test, expect } from '@playwright/test';

test('bio layout at max width', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('https://mattheard.net', { waitUntil: 'networkidle' });

  const header = page.locator('#container > div:first-child').first();
  await header.screenshot({ path: 'e2e-results/bio-layout-fixed.png' });
  
  const bioKey = page.locator('.key:has-text("bio")').first();
  const bioValue = bioKey.locator('+ .value');
  
  const keyBox = await bioKey.boundingBox();
  const valueBox = await bioValue.boundingBox();
  
  console.log('\n=== BIO LAYOUT ===');
  console.log('Key (x, y, width, height):', keyBox);
  console.log('Value (x, y, width, height):', valueBox);
  console.log('Key ends at x:', keyBox.x + keyBox.width);
  console.log('Value starts at x:', valueBox.x);
  console.log('Same row?', Math.abs(keyBox.y - valueBox.y) < 30);
});
