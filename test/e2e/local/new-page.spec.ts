import { test, expect } from '@playwright/test';
import { expectSharedChrome } from '../static-pages.helpers';

function getApiBaseUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is required for new-page e2e tests');
  }

  return apiBaseUrl;
}

test('serves new-page.html with submission form', async ({ page }) => {
  const config = await (
    await page.request.get(new URL('/config.json', getApiBaseUrl()).toString())
  ).json();
  expect(typeof config.submitNewPageUrl).toBe('string');

  await page.goto('/new-page.html', { waitUntil: 'domcontentloaded' });

  await expectSharedChrome(page);

  await expect(page).toHaveTitle('New Page');
  await expect(page.getByRole('heading', { level: 1, name: 'New page' })).toBeVisible();

  const form = page.locator('form');
  await expect(form).toBeVisible();
  const action = await form.getAttribute('action');
  expect(action).toBeTruthy();
  expect(new URL(action as string).pathname).toBe(
    new URL(config.submitNewPageUrl).pathname,
  );
  await expect(form.locator('input[name="incoming_option"]')).toHaveAttribute('type', 'hidden');
  await expect(form.locator('input[name="page"]')).toHaveAttribute('type', 'hidden');
  await expect(form.locator('#option0')).toHaveAttribute('placeholder', 'Option 1');
  await expect(form.locator('#option3')).toHaveAttribute('placeholder', 'Option 4');
  await expect(form.locator('button[type="submit"]')).toHaveText('Submit');
});
