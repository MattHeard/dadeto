# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manual.spec.ts >> serves manual.html with guidance copy
- Location: test/e2e/manual.spec.ts:4:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/manual.html", waiting until "domcontentloaded"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { expectSharedChrome } from './static-pages.helpers';
  3  | 
  4  | test('serves manual.html with guidance copy', async ({ page }) => {
> 5  |   await page.goto('/manual.html', { waitUntil: 'domcontentloaded' });
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6  | 
  7  |   await expectSharedChrome(page);
  8  | 
  9  |   await expect(page).toHaveTitle('Dendrite - User Manual');
  10 |   await expect(page.getByRole('heading', { level: 1, name: 'User Manual' })).toBeVisible();
  11 |   await expect(page.locator('main')).toContainText('Welcome to Dendrite. This guide explains');
  12 |   await expect(page.getByRole('heading', { level: 2, name: 'Reading stories' })).toBeVisible();
  13 |   await expect(page.getByRole('heading', { level: 2, name: 'Creating new content' })).toBeVisible();
  14 | });
  15 | 
```