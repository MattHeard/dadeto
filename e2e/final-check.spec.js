import { test, expect } from '@playwright/test';

test('final bio layout check', async ({ page }) => {
  // Set default viewport
  await page.setViewportSize({ width: 1280, height: 1080 });
  await page.goto('https://mattheard.net', { waitUntil: 'networkidle' });

  // Check the bio structure in the DOM
  const bioEntry = page.locator('.entry').filter({ has: page.locator('.key:has-text("bio")') }).first();
  const bioKey = bioEntry.locator('.key:has-text("bio")');
  const bioValue = bioEntry.locator('.value').filter({ has: page.locator('text=Software developer') });
  
  // Check they're visible and on same row
  await expect(bioKey).toBeVisible();
  await expect(bioValue).toBeVisible();
  
  const keyBox = await bioKey.boundingBox();
  const valueBox = await bioValue.boundingBox();
  
  console.log('Key:', keyBox);
  console.log('Value:', valueBox);
  
  // They should be on the same row (within same y range)
  const sameRow = Math.abs(keyBox.y - valueBox.y) < 50;
  console.log('Same row?', sameRow);
  
  // Take screenshot
  await bioEntry.screenshot({ path: 'e2e-results/bio-final.png' });
});
