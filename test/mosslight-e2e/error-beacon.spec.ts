import { expect, test } from '@playwright/test';

test('browser console and DOM facade report errors without recursive logging', async ({ page }) => {
  const messages: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/prod-errors', async route => {
    const payload = route.request().postDataJSON();
    messages.push(payload.message);
    await route.fulfill({ status: 204 });
  });
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('.mosslight-keypad'));
  await page.evaluate(async () => {
    const { logError } = await import('/core/browser/document.js');
    logError('beacon-regression-facade');
    console.error('beacon-regression-console');
    console.error('beacon-regression-console');
  });
  await expect.poll(() => messages.filter(message => message.startsWith('beacon-regression-'))).toEqual([
    'beacon-regression-facade',
    'beacon-regression-console',
  ]);
  expect(pageErrors).toEqual([]);
});
