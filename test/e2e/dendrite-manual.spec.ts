import { test, expect } from '@playwright/test';

const base = process.env.BASE_URL || 'http://127.0.0.1';
const manualPageUrl = `${base}/manual.html`;

test.describe('dendrite manual static page', () => {
  test('shows navigation and core manual content', async ({ page }) => {
    const log = (message: string) =>
      console.log(`[dendrite-manual.spec] ${new Date().toISOString()} ${message}`);

    log('Starting dendrite manual page assertions');
    log(`Navigating to ${manualPageUrl}`);
    await page.goto(manualPageUrl);
    log('Navigation resolved');

    await expect(page).toHaveTitle('Dendrite - User Manual');
    log('Verified page title');
    await expect(page.getByRole('heading', { level: 1, name: 'User Manual' })).toBeVisible();
    log('Confirmed primary heading visibility');

    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'New story' })).toHaveAttribute('href', '/new-story.html');
    await expect(page.getByRole('link', { name: 'Moderate' })).toHaveAttribute('href', '/mod.html');
    await expect(page.getByRole('link', { name: 'Stats' })).toHaveAttribute('href', '/stats.html');
    await expect(page.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about.html');

    const manualIntro =
      'Welcome to Dendrite. This guide explains how to read and create branching stories.';
    await expect(page.getByText(manualIntro)).toBeVisible();
    log('Manual introduction located');
    await expect(page.getByRole('heading', { level: 2, name: 'Reading stories' })).toBeVisible();
    log('Reading stories section visible');
    await expect(page.getByRole('heading', { level: 2, name: 'Creating new content' })).toBeVisible();
    log('Creating new content section visible');
    await expect(page.getByRole('heading', { level: 2, name: 'Moderation' })).toBeVisible();
    log('Moderation section visible');

    const screenshotPath = test.info().outputPath('dendrite-manual.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    log(`Saved screenshot to ${screenshotPath}`);
  });
});
