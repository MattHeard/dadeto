import { test, expect } from '@playwright/test';

const manualPageUrl = new URL('../infra/manual.html', import.meta.url).toString();

test('dendrite manual page shows navigation and core content', async ({ page }) => {
  await page.goto(manualPageUrl);

  await expect(page).toHaveTitle('Dendrite - User Manual');
  await expect(page.getByRole('heading', { level: 1, name: 'User Manual' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Reading stories' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Creating new content' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Moderation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'New story' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Moderate' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'About' }).first()).toBeVisible();
  await expect(
    page.getByText(
      'Welcome to Dendrite. This guide explains how to read and create branching stories.',
    ),
  ).toBeVisible();
});
