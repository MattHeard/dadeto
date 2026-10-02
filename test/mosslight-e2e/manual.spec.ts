import { test, expect } from '@playwright/test';

test('manual loads only when opened and remains cached', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/manuals/')) requests.push(request.url());
  });
  await page.goto('/');
  const manual = page.locator('[data-manual-src="/manuals/mosslight-valley.md"]');
  const button = manual.locator('[data-manual-toggle]');
  await expect(button).toBeVisible();
  expect(requests).toHaveLength(0);
  await button.click();
  await expect(manual.locator('pre')).toContainText('Mosslight');
  await button.click();
  await expect(manual.locator('pre')).toBeHidden();
  await button.click();
  await expect(manual.locator('pre')).toBeVisible();
  expect(requests).toHaveLength(1);
});

test('manual fetch failures are readable and retryable', async ({ page }) => {
  await page.route('**/manuals/mosslight-valley.md', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/');
  const manual = page.locator('[data-manual-src="/manuals/mosslight-valley.md"]');
  const button = manual.locator('[data-manual-toggle]');
  await button.click();
  await expect(manual.locator('pre')).toContainText('reopen to retry');
  await page.unroute('**/manuals/mosslight-valley.md');
  await button.click();
  await button.click();
  await expect(manual.locator('pre')).toContainText('Mosslight');
});
