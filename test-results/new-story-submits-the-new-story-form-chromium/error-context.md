# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: new-story.spec.ts >> submits the new story form
- Location: test/e2e/new-story.spec.ts:104:1

# Error details

```
Error: PLAYWRIGHT_BASE_URL or BASE_URL is required for new-story e2e tests
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { expectSharedChrome } from './static-pages.helpers';
  3   | 
  4   | function getApiBaseUrl() {
  5   |   const apiBaseUrl = process.env.API_BASE_URL;
  6   |   if (!apiBaseUrl) {
  7   |     throw new Error('API_BASE_URL is required for new-story e2e tests');
  8   |   }
  9   | 
  10  |   return apiBaseUrl;
  11  | }
  12  | 
  13  | function getPageBaseUrl() {
  14  |   const pageBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL;
  15  |   if (!pageBaseUrl) {
> 16  |     throw new Error(
      |           ^ Error: PLAYWRIGHT_BASE_URL or BASE_URL is required for new-story e2e tests
  17  |       'PLAYWRIGHT_BASE_URL or BASE_URL is required for new-story e2e tests',
  18  |     );
  19  |   }
  20  | 
  21  |   return pageBaseUrl;
  22  | }
  23  | 
  24  | test('serves new-story.html through the proxy', async ({ page }) => {
  25  |   await page.goto('/new-story.html', {
  26  |     waitUntil: 'domcontentloaded',
  27  |   });
  28  | 
  29  |   await expectSharedChrome(page);
  30  | 
  31  |   await expect(page).toHaveTitle('New Story');
  32  |   await expect(page.getByRole('heading', { name: /New story/i })).toBeVisible();
  33  | 
  34  |   const primaryNav = page.getByRole('navigation', { name: 'Primary' });
  35  |   const desktopLinks: Array<[string, string]> = [
  36  |     ['New story', '/new-story.html'],
  37  |     ['Moderate', '/mod.html'],
  38  |     ['Stats', '/stats.html'],
  39  |     ['About', '/about.html'],
  40  |   ];
  41  | 
  42  |   for (const [label, href] of desktopLinks) {
  43  |     await expect(primaryNav.getByRole('link', { name: label })).toHaveAttribute(
  44  |       'href',
  45  |       href,
  46  |     );
  47  |   }
  48  | 
  49  |   const desktopAdminLink = primaryNav.getByRole('link', {
  50  |     name: 'Admin',
  51  |     includeHidden: true,
  52  |   });
  53  |   await expect(desktopAdminLink).toBeHidden();
  54  |   await expect(primaryNav.locator('#signinButton')).toHaveCount(1);
  55  |   await expect(primaryNav.locator('#signoutWrap')).toBeHidden();
  56  | 
  57  |   await page.setViewportSize({ width: 390, height: 844 });
  58  | 
  59  |   const menuToggle = page.getByRole('button', { name: 'Open menu' });
  60  |   const mobileMenu = page.locator('#mobile-menu');
  61  |   await expect(menuToggle).toBeVisible();
  62  |   await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
  63  |   await expect(mobileMenu).toBeHidden();
  64  | 
  65  |   await menuToggle.click();
  66  |   await expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
  67  |   await expect(mobileMenu).toBeVisible();
  68  | 
  69  |   for (const [label, href] of desktopLinks) {
  70  |     await expect(
  71  |       mobileMenu.getByRole('link', { name: label, exact: true }),
  72  |     ).toHaveAttribute('href', href);
  73  |   }
  74  | 
  75  |   const mobileAdminLink = mobileMenu.getByRole('link', {
  76  |     name: 'Admin',
  77  |     includeHidden: true,
  78  |   });
  79  |   await expect(mobileAdminLink).toBeHidden();
  80  |   await expect(mobileMenu.locator('#signinButton')).toHaveCount(1);
  81  |   await expect(mobileMenu.locator('#signoutWrap')).toBeHidden();
  82  | 
  83  |   const form = page.locator('form');
  84  |   await expect(form).toBeVisible();
  85  | 
  86  |   await expect(page.getByLabel('Title')).toHaveAttribute('id', 'title');
  87  |   await expect(page.getByLabel('Content')).toHaveAttribute('id', 'content');
  88  |   await expect(page.getByLabel('Author')).toHaveAttribute('id', 'author');
  89  | 
  90  |   const optionFields: Array<[string, string]> = [
  91  |     ['Option 1', 'option0'],
  92  |     ['Option 2', 'option1'],
  93  |     ['Option 3', 'option2'],
  94  |     ['Option 4', 'option3'],
  95  |   ];
  96  | 
  97  |   for (const [label, name] of optionFields) {
  98  |     await expect(page.getByLabel(label)).toHaveAttribute('name', name);
  99  |   }
  100 | 
  101 |   await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  102 | });
  103 | 
  104 | test('submits the new story form', async ({ page }) => {
  105 |   await page.goto(new URL('/new-story.html', getPageBaseUrl()).toString(), {
  106 |     waitUntil: 'domcontentloaded',
  107 |   });
  108 | 
  109 |   const apiConfigResponse = await page.request.get(
  110 |     new URL('/config.json', getPageBaseUrl()).toString(),
  111 |   );
  112 |   const config = (await apiConfigResponse.json()) as {
  113 |     submitNewStoryUrl?: string;
  114 |   };
  115 |   expect(apiConfigResponse.status()).toBe(200);
  116 |   const submitNewStoryUrl = config.submitNewStoryUrl;
```