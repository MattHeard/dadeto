import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

function getApiBaseUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is required for new-story e2e tests');
  }

  return apiBaseUrl;
}

test('serves new-story.html through the proxy', async ({ page }) => {
  await page.goto('/new-story.html', {
    waitUntil: 'domcontentloaded',
  });

  await expectSharedChrome(page);

  await expect(page).toHaveTitle('New Story');
  await expect(page.getByRole('heading', { name: /New story/i })).toBeVisible();

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

  await page.setViewportSize({ width: 390, height: 844 });

  const menuToggle = page.getByRole('button', { name: 'Open menu' });
  const mobileMenu = page.locator('#mobile-menu');
  await expect(menuToggle).toBeVisible();
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
  await page.goto(new URL('/new-story.html', getApiBaseUrl()).toString(), {
    waitUntil: 'domcontentloaded',
  });

  const apiConfigResponse = await page.request.get(
    new URL('/config.json', getApiBaseUrl()).toString(),
  );
  const config = (await apiConfigResponse.json()) as {
    submitNewStoryUrl?: string;
  };
  expect(apiConfigResponse.status()).toBe(200);
  const submitNewStoryUrl = config.submitNewStoryUrl;
  expect(submitNewStoryUrl, 'submitNewStoryUrl from config').toBeTruthy();

  if (!submitNewStoryUrl) {
    throw new Error('Expected submitNewStoryUrl in config.json response');
  }

  await expect(page.locator('form')).toHaveAttribute(
    'action',
    /\/__sim\/submit-new-story$/,
  );

  await page.getByLabel('Title').fill('Playwright Story');
  await page.getByLabel('Content').fill('A story created through the form.');
  await page.getByLabel('Author').fill('Playwright');
  await page.getByLabel('Option 1').fill('Keep going');

  await Promise.all([
    page.waitForURL('**/index.html', { waitUntil: 'domcontentloaded' }),
    page.getByRole('button', { name: 'Submit' }).click(),
  ]);

  await expect(page.getByText('Playwright Story')).toBeVisible();
  await expect(page.getByText('Contents')).toBeVisible();
});
