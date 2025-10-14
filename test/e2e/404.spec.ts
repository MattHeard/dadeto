import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

test('serves 404.html with error details', async ({ page }) => {
  const response = await page.goto('/404.html', { waitUntil: 'domcontentloaded' });

  expect(response, 'navigation response').not.toBeNull();
  expect(response!.status()).toBe(200);

  await expectSharedChrome(page);

  await expect(page).toHaveTitle('Page Not Found');
  await expect(
    page.getByRole('heading', { level: 1, name: '404 - Page Not Found' }),
  ).toBeVisible();
  await expect(page.locator('main')).toContainText('requested content could not be found');
});
