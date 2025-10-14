import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

test('serves admin.html with moderation controls', async ({ page }) => {
  const response = await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });

  expect(response, 'navigation response').not.toBeNull();
  expect(response!.status()).toBe(200);

  await expectSharedChrome(page);

  await expect(page).toHaveTitle('Admin');

  const adminContent = page.locator('#adminContent');
  await expect(adminContent).toBeHidden();
  await expect(
    adminContent.getByRole('button', { name: 'Render contents', includeHidden: true }),
  ).toHaveCount(1);
  await expect(
    adminContent.getByRole('button', { name: 'Generate stats', includeHidden: true }),
  ).toHaveCount(1);
  await expect(page.locator('#regenForm')).toContainText('Page variant');
  await expect(page.locator('#regenInput')).toHaveAttribute('placeholder', '5a');
});
