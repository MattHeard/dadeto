import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

test('serves new-story.html through the proxy', async ({ page }) => {
  const response = await page.goto('/new-story.html', {
    waitUntil: 'domcontentloaded',
  });

  expect(response, 'navigation response').not.toBeNull();
  expect(response!.status()).toBe(200);

  await expectSharedChrome(page);

  await expect(page).toHaveTitle('New Story');
  await expect(page.locator('h1')).toHaveText(/New story/i);

  const primaryNav = page.getByRole('navigation', { name: 'Primary' });
  const desktopLinks: Array<[string, string]> = [
    ['New story', '/new-story.html'],
    ['Moderate', '/mod.html'],
    ['Stats', '/stats.html'],
    ['About', '/about.html'],
  ];

  for (const [label, href] of desktopLinks) {
    await expect(primaryNav.getByRole('link', { name: label })).toHaveAttribute(
      'href',
      href,
    );
  }

  const desktopAdminLink = primaryNav.getByRole('link', {
    name: 'Admin',
    includeHidden: true,
  });
  await expect(desktopAdminLink).toBeHidden();
  await expect(primaryNav.locator('#signinButton')).toHaveCount(1);
  await expect(primaryNav.locator('#signoutWrap')).toBeHidden();

  const menuToggle = page.getByRole('button', { name: 'Open menu' });
  const mobileMenu = page.locator('#mobile-menu');
  await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(mobileMenu).toBeHidden();

  await menuToggle.click();
  await expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(mobileMenu).toBeVisible();

  for (const [label, href] of desktopLinks) {
    await expect(
      mobileMenu.getByRole('link', { name: label, exact: true }),
    ).toHaveAttribute('href', href);
  }

  const mobileAdminLink = mobileMenu.getByRole('link', {
    name: 'Admin',
    includeHidden: true,
  });
  await expect(mobileAdminLink).toBeHidden();
  await expect(mobileMenu.locator('#signinButton')).toHaveCount(1);
  await expect(mobileMenu.locator('#signoutWrap')).toBeHidden();

  const form = page.locator('form');
  await expect(form).toBeVisible();

  await expect(page.getByLabel('Title')).toHaveAttribute('id', 'title');
  await expect(page.getByLabel('Content')).toHaveAttribute('id', 'content');
  await expect(page.getByLabel('Author')).toHaveAttribute('id', 'author');

  const optionFields: Array<[string, string]> = [
    ['Option 1', 'option0'],
    ['Option 2', 'option1'],
    ['Option 3', 'option2'],
    ['Option 4', 'option3'],
  ];

  for (const [label, name] of optionFields) {
    await expect(page.getByLabel(label)).toHaveAttribute('name', name);
  }

  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
});

test('submits the new story form', async ({ page }) => {
  await page.goto('/new-story.html', {
    waitUntil: 'domcontentloaded',
  });

  const submitAction = await page.locator('form').getAttribute('action');

  expect(submitAction, 'form action').not.toBeNull();

  const submitEndpoint = submitAction!;
  const submitUrl = new URL(submitEndpoint, page.url());
  expect(submitUrl.pathname).toMatch(/submit-new-story$/);

  await page.route(submitEndpoint, async (route) => {
    await route.fulfill({ status: 200, body: 'OK' });
  });

  await page.getByLabel('Title').fill('Playwright submission title');
  await page
    .getByLabel('Content')
    .fill('This is a test submission triggered by Playwright.');
  await page.getByLabel('Author').fill('Automated Test');

  const optionEntries: Array<[string, string]> = [
    ['Option 1', 'First option'],
    ['Option 2', 'Second option'],
    ['Option 3', 'Third option'],
    ['Option 4', 'Fourth option'],
  ];

  for (const [label, value] of optionEntries) {
    await page.getByLabel(label).fill(value);
  }

  await Promise.all([
    page.waitForRequest(submitEndpoint),
    page.getByRole('button', { name: 'Submit' }).click(),
  ]);
});
