import { test, expect } from '@playwright/test';

test('Auto-submit checkbox works correctly on IDEN1 toy', async ({ page }) => {
  await page.goto('https://mattheard.net/#IDEN1', {
    waitUntil: 'domcontentloaded',
  });

  const article = page.locator('#IDEN1');
  await expect(article).toBeVisible({ timeout: 15000 });

  const inputField = article.locator('input[type="text"]').first();
  await expect(inputField).toBeEnabled({ timeout: 10000 });

  const autoCheckbox = article.locator('.auto-submit-checkbox').first();
  await expect(autoCheckbox).toBeVisible();
  await expect(autoCheckbox).not.toBeChecked();

  const submitButton = article.locator('button[type="submit"]').first();
  await expect(submitButton).toBeVisible();

  await autoCheckbox.check();
  await expect(autoCheckbox).toBeChecked();

  await inputField.fill('test value');
  await page.waitForTimeout(200);

  await autoCheckbox.uncheck();
  await expect(autoCheckbox).not.toBeChecked();
  await autoCheckbox.check();
  await expect(autoCheckbox).toBeChecked();
});
