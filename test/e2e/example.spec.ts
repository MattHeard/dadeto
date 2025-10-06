import { test, expect } from '@playwright/test';

test('renders a page with a title', async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Hello World</title></head>
      <body><h1>It works</h1></body>
    </html>
  `);
  await expect(page).toHaveTitle('Hello World');
  const screenshot = await page.screenshot();
  await test.info().attach('page-screenshot', {
    body: screenshot,
    contentType: 'image/png',
  });
});
