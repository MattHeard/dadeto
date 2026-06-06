import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

test('serves 404.html with error details', async ({ page }) => {
  await page.goto('/404.html', { waitUntil: 'domcontentloaded' });

  await expectSharedChrome(page);

  await expect(page).toHaveTitle('Page Not Found');
  await expect(
    page.getByRole('heading', { level: 1, name: '404 - Page Not Found' }),
  ).toBeVisible();
  await expect(page.locator('main')).toContainText('requested content could not be found');
});
