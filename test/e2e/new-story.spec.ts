import { test, expect } from '@playwright/test';

test('serves new-story.html', async ({ page }) => {
  const baseUrl = test.info().project.use.baseURL;
  if (!baseUrl) {
    test.skip(true, 'BASE_URL must be configured to reach the proxy service');
    return;
  }

  const response = await page.goto('/new-story.html', {
    waitUntil: 'domcontentloaded',
  });

  expect(response, 'navigation response').not.toBeNull();
  expect(response!.status()).toBe(200);
  await expect(page).toHaveTitle('New Story');
  await expect(page.getByRole('heading', { level: 1, name: 'New story' })).toBeVisible();

  const header = page.locator('header.site-header');
  await expect(header.locator('a.brand')).toContainText('Dendrite');
  await expect(header.locator('nav a')).toHaveText([
    'New story',
    'Moderate',
    'Stats',
    'About',
    'Admin',
  ]);

  const form = page.locator('form.wide-form');
  await expect(form).toBeVisible();
  await expect(form.locator('label[for="title"]')).toHaveText('Title');
  await expect(form.locator('#title')).toHaveAttribute('name', 'title');
  await expect(form.locator('label[for="content"]')).toHaveText('Content');
  await expect(form.locator('#content')).toHaveAttribute('name', 'content');
  await expect(form.locator('label[for="author"]')).toHaveText('Author');
  await expect(form.locator('#author')).toHaveAttribute('name', 'author');
  await expect(form.getByRole('group', { name: 'Options' })).toBeVisible();
  await expect(form.getByLabel('Option 1')).toHaveAttribute('placeholder', 'Option 1');
  await expect(form.getByLabel('Option 2')).toHaveAttribute('placeholder', 'Option 2');
  await expect(form.getByLabel('Option 3')).toHaveAttribute('placeholder', 'Option 3');
  await expect(form.getByLabel('Option 4')).toHaveAttribute('placeholder', 'Option 4');
  await expect(form.getByRole('button', { name: 'Submit' })).toBeEnabled();
});
