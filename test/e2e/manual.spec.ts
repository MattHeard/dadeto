import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

test('serves manual.html with guidance copy', async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error('PLAYWRIGHT_BASE_URL or BASE_URL is required for manual.spec.ts');
  }

  await page.goto(new URL('/manual.html', baseUrl).toString(), {
    waitUntil: 'domcontentloaded',
  });

  await expectSharedChrome(page);

  await expect(page).toHaveTitle('Dendrite - User Manual');
  await expect(page.getByRole('heading', { level: 1, name: 'User Manual' })).toBeVisible();
  await expect(page.locator('main')).toContainText('Welcome to Dendrite. This guide explains');
  await expect(page.getByRole('heading', { level: 2, name: 'Reading stories' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Creating new content' })).toBeVisible();
});
