import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

test('serves mod.html with moderation workflow scaffolding', async ({ page }) => {
  const response = await page.goto('/mod.html', { waitUntil: 'domcontentloaded' });

  expect(response, 'navigation response').not.toBeNull();
  expect(response!.status()).toBe(200);

  await expectSharedChrome(page);

  await expect(page).toHaveTitle('Dendrite - Moderate a story page');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Moderate a story page' }),
  ).toBeVisible();
  await expect(page.locator('main')).toContainText('Please contribute to keeping Dendrite');
  await expect(page.locator('#actions').getByRole('button', { name: 'Approve' })).toBeDisabled();
  await expect(page.locator('#actions').getByRole('button', { name: 'Reject' })).toBeDisabled();
  await expect(page.locator('#fetching')).toContainText('Fetching...');
});
