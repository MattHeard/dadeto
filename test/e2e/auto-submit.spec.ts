import { test, expect } from '@playwright/test';

test('Auto-submit checkbox works correctly on IDEN1 toy', async ({ page }) => {
  // Navigate to the page with hash
  await page.goto('https://mattheard.net/#IDEN1', { waitUntil: 'networkidle' });

  // Wait for the IDEN1 article to be visible
  const article = page.locator('#IDEN1');
  await expect(article).toBeVisible({ timeout: 15000 });

  // Wait for the input field within IDEN1 to be enabled
  const inputField = article.locator('input[type="text"]').first();
  await expect(inputField).toBeEnabled({ timeout: 10000 });
  
  // Find the auto-submit checkbox within IDEN1
  const autoCheckbox = article.locator('.auto-submit-checkbox').first();

  // Verify it exists
  await expect(autoCheckbox).toBeVisible();

  // Verify it's unchecked by default
  const isUnchecked = await autoCheckbox.isChecked();
  expect(isUnchecked).toBe(false);

  // Find the submit button
  const submitButton = article.locator('button[type="submit"]').first();

  // Verify submit button exists and is visible
  await expect(submitButton).toBeVisible();

  // Test checkbox toggle: check it
  await autoCheckbox.check();

  // Verify it's now checked
  let isChecked = await autoCheckbox.isChecked();
  expect(isChecked).toBe(true);

  // Fill in a test value
  await inputField.fill('test value');

  // Wait for any potential auto-submit actions
  await page.waitForTimeout(200);

  // Uncheck the auto-submit checkbox
  await autoCheckbox.uncheck();

  // Verify it's unchecked
  isChecked = await autoCheckbox.isChecked();
  expect(isChecked).toBe(false);

  // Re-check to verify it can be toggled again
  await autoCheckbox.check();

  isChecked = await autoCheckbox.isChecked();
  expect(isChecked).toBe(true);

  console.log('✅ Auto-submit checkbox test passed');
});
