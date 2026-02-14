import { test, expect } from '@playwright/test';

test('check bio layout with wider viewport', async ({ page }) => {
  // Set a wider viewport to see full layout
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('https://mattheard.net', { waitUntil: 'networkidle' });

  // Take header screenshot
  const header = page.locator('#container > div:first-child').first();
  await header.screenshot({ path: 'e2e-results/mattheard-header-wide.png' });
  
  // Check bio positioning
  const bioKey = page.locator('.key:has-text("bio")').first();
  const bioValue = bioKey.locator('..').locator('.value').first();
  
  const bioKeyBox = await bioKey.boundingBox();
  const bioValueBox = await bioValue.boundingBox();
  
  console.log('Bio key position:', bioKeyBox);
  console.log('Bio value position:', bioValueBox);
  console.log('Bio key right:', bioKeyBox?.x + bioKeyBox?.width);
  console.log('Bio value left:', bioValueBox?.x);
});
