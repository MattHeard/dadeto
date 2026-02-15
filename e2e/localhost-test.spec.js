import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:3000' });

test('header layout on localhost', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const entry = page.locator('#container > .entry').first();
  await entry.screenshot({ path: 'e2e-results/localhost-header.png' });
  
  console.log('\n✓ Header screenshot captured from localhost');
  
  // Verify structure
  const keys = await entry.locator('> .key').count();
  const values = await entry.locator('> .value').count();
  console.log(`✓ Structure: ${keys} keys, ${values} values`);
  
  // Check bio alignment
  const bioKey = entry.locator('.key:has-text("bio")');
  const bioValue = bioKey.locator('+ .value');
  
  await expect(bioKey).toBeVisible();
  await expect(bioValue).toBeVisible();
  
  const keyBox = await bioKey.boundingBox();
  const valueBox = await bioValue.boundingBox();
  
  // Keys should be to the left of values
  expect(keyBox.x + keyBox.width).toBeLessThan(valueBox.x);
  console.log(`✓ Bio key x: ${keyBox.x}, ends at: ${keyBox.x + keyBox.width}`);
  console.log(`✓ Bio value x: ${valueBox.x}`);
  
  // Vertical alignment - key should be at top of value (within a few pixels)
  expect(Math.abs(keyBox.y - valueBox.y)).toBeLessThan(10);
  console.log(`✓ Vertical alignment: key y=${keyBox.y}, value y=${valueBox.y}`);
});
