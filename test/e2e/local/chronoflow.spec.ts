import { test, expect } from '@playwright/test';

test('plays and resets the untimed Chronoflow Archive Entry level', async ({ page }) => {
  await page.goto('/chronoflow/');

  await expect(page).toHaveTitle(/Chronoflow/);
  await expect(page.getByRole('heading', { level: 1, name: /Chronoflow/ })).toBeVisible();
  await expect(page.locator('#clock-status')).toContainText('Untimed practice');

  await page.getByRole('button', { name: 'Open sluice' }).click();
  const advance = page.getByRole('button', { name: 'Advance water · 60 steps' });
  for (let batch = 0; batch < 30; batch += 1) {
    if (await page.locator('#chronoflow-status').textContent() === 'Archive chamber primed. Level complete.') break;
    await advance.click();
  }
  await expect(page.locator('#chronoflow-status')).toHaveText('Archive chamber primed. Level complete.');

  await page.getByRole('button', { name: 'Reset level' }).click();
  await expect(page.locator('#chronoflow-status')).toContainText('step 0');
  await expect(page.getByRole('button', { name: 'Open sluice' })).toBeEnabled();
});
