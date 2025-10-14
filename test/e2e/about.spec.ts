import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

test('serves about.html with contributor information', async ({ page }) => {
  const response = await page.goto('/about.html', { waitUntil: 'domcontentloaded' });

  expect(response, 'navigation response').not.toBeNull();
  expect(response!.status()).toBe(200);

  await expectSharedChrome(page);

  await expect(page).toHaveTitle('Dendrite - About');
  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Discuss Dendrite with us at:' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'reddit.com/r/DendriteStories' }),
  ).toHaveAttribute('href', 'https://reddit.com/r/DendriteStories');
  await expect(page.locator('main')).toContainText('Dendrite is an online, choose-your-own-adventure book');
});
