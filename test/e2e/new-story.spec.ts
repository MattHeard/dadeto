import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

test('serves new-story.html through the proxy', async ({ page }) => {
  const response = await page.goto('/new-story.html', {
    waitUntil: 'domcontentloaded',
  });

  expect(response, 'navigation response').not.toBeNull();
  expect(response!.status()).toBe(200);

  await expectSharedChrome(page);

  await expect(page).toHaveTitle('New Story');
  await expect(page.locator('h1')).toHaveText(/New story/i);
});
