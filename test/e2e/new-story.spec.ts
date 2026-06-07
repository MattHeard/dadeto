import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

test('serves new-story.html through the proxy', async ({ page }) => {
  await page.goto('/new-story.html', {
    waitUntil: 'domcontentloaded',
  });

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
  const configResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/config.json'),
    { timeout: 2000 },
  );

  await page.goto('/new-story.html', {
    waitUntil: 'domcontentloaded',
  });

  const configResponse = await configResponsePromise;

  const config = (await configResponse.json()) as {
    submitNewStoryUrl?: string;
  };
  const submitNewStoryUrl = config.submitNewStoryUrl;
  expect(submitNewStoryUrl, 'submitNewStoryUrl from config').toBeTruthy();

  if (!submitNewStoryUrl) {
    throw new Error('Expected submitNewStoryUrl in config.json response');
  }

  await expect(page.locator('form')).toHaveAttribute('action', submitNewStoryUrl);

  const submitUrl = new URL(submitNewStoryUrl);
  expect(submitUrl.pathname).toMatch(/submit-new-story$/);

  const submissionTitle = 'Playwright submission title';
  const submissionContent = 'This is a test submission triggered by Playwright.';
  const submissionAuthor = 'Automated Test';

  await page.getByLabel('Title').fill(submissionTitle);
  await page.getByLabel('Content').fill(submissionContent);
  await page.getByLabel('Author').fill(submissionAuthor);

  const optionEntries: Array<[string, string]> = [
    ['Option 1', 'First option'],
    ['Option 2', 'Second option'],
    ['Option 3', 'Third option'],
    ['Option 4', 'Fourth option'],
  ];

  for (const [label, value] of optionEntries) {
    await page.getByLabel(label).fill(value);
  }

  await expect(page.locator('form')).toHaveAttribute(
    'data-submit-handler-ready',
    'true',
  );

  const submitButton = page.getByRole('button', { name: 'Submit' });
  const initialUrl = page.url();

  await Promise.all([
    page.waitForURL(url => url.href !== initialUrl),
    submitButton.click(),
  ]);

  await expect(page).toHaveTitle(`Dendrite - ${submissionTitle}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    submissionTitle,
  );

  const main = page.locator('main');
  await expect(main).toContainText(submissionContent);
  await expect(main).toContainText(`By ${submissionAuthor}`);
});
