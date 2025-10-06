import { test, expect } from '@playwright/test';

const manualPageUrl = new URL('../infra/manual.html', import.meta.url).href;

test.describe('dendrite manual static page', () => {
  test('shows navigation and core manual content', async ({ page }) => {
    await page.goto(manualPageUrl);

    await expect(page).toHaveTitle('Dendrite - User Manual');
    await expect(page.getByRole('heading', { level: 1, name: 'User Manual' })).toBeVisible();

    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'New story' })).toHaveAttribute('href', '/new-story.html');
    await expect(page.getByRole('link', { name: 'Moderate' })).toHaveAttribute('href', '/mod.html');
    await expect(page.getByRole('link', { name: 'Stats' })).toHaveAttribute('href', '/stats.html');
    await expect(page.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about.html');

    const manualIntro =
      'Welcome to Dendrite. This guide explains how to read and create branching stories.';
    await expect(page.getByText(manualIntro)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Reading stories' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Creating new content' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Moderation' })).toBeVisible();
  });
});
