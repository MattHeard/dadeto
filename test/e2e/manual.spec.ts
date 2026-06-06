import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

test('serves manual.html with guidance copy', async ({ page }) => {
  await page.goto('/manual.html', { waitUntil: 'domcontentloaded' });

  await expectSharedChrome(page);

  await expect(page).toHaveTitle('Dendrite - User Manual');
  await expect(page.getByRole('heading', { level: 1, name: 'User Manual' })).toBeVisible();
  await expect(page.locator('main')).toContainText('Welcome to Dendrite. This guide explains');
  await expect(page.getByRole('heading', { level: 2, name: 'Reading stories' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Creating new content' })).toBeVisible();
});
