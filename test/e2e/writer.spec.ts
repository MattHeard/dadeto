import { test, expect } from '@playwright/test';

test('writer workflow loads, saves, and pages right', async ({ page }) => {
  const response = await page.goto('/writer/', { waitUntil: 'domcontentloaded' });

  expect(response, 'navigation response').not.toBeNull();
  expect(response!.status()).toBe(200);

  await expect(page.locator('#save-state')).toHaveText(/Loaded|Saved/);
  await expect(page.locator('#previous-title')).toHaveText('Thesis');
  await expect(page.locator('#current-title')).toHaveText('Syllogistic Argument');

  const editor = page.locator('#current-content');
  await editor.fill('# E2E Argument\n\nPremise one.\nPremise two.');
  await expect(page.locator('#masthead-title')).toHaveText('E2E Argument');
  await expect(page.locator('#save-state')).toHaveText(/Saved/);

  await page.keyboard.press('Alt+ArrowRight');

  await expect(page.locator('#previous-title')).toHaveText('Syllogistic Argument');
  await expect(page.locator('#current-title')).toHaveText('Outline');
  await expect(page.locator('#previous-content')).toContainText('Premise one.');
  await expect(page.locator('#sequence')).toContainText('3. Outline');
});
