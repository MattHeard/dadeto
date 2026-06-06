import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

test('serves new-page.html with submission form', async ({ page }) => {
  const config = await (await page.request.get('/config.json')).json();
  expect(typeof config.submitNewPageUrl).toBe('string');

  await page.goto('/new-page.html', { waitUntil: 'domcontentloaded' });

  await expectSharedChrome(page);

  await expect(page).toHaveTitle('New Page');
  await expect(page.getByRole('heading', { level: 1, name: 'New page' })).toBeVisible();

  const form = page.locator('form');
  await expect(form).toBeVisible();
  await expect(form).toHaveAttribute('action', config.submitNewPageUrl);
  await expect(form.locator('input[name="incoming_option"]')).toHaveAttribute('type', 'hidden');
  await expect(form.locator('input[name="page"]')).toHaveAttribute('type', 'hidden');
  await expect(form.locator('#option0')).toHaveAttribute('placeholder', 'Option 1');
  await expect(form.locator('#option3')).toHaveAttribute('placeholder', 'Option 4');
  await expect(form.locator('button[type="submit"]')).toHaveText('Submit');
});
