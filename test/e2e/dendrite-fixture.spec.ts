import { test, expect } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

/**
 * Load the seeded fixture manifest and make the admin token available to the browser.
 * @param {import('@playwright/test').Page} page Playwright page.
 * @returns {Promise<{
 *   idToken: string,
 *   storyTitle: string,
 *   moderation: { firstContent: string, secondContent: string },
 *   story: { firstPagePath: string, secondPagePath: string, optionText: string },
 *   expectedStatsAfterModeration: {
 *     storyCount: number,
 *     pageCount: number,
 *     unmoderatedPageCount: number,
 *   },
 * }>} Seeded fixture manifest.
 */
async function loadFixture(page) {
  const response = await page.goto('/seed.json', { waitUntil: 'domcontentloaded' });
  expect(response, 'seed response').not.toBeNull();
  expect(response!.status()).toBe(200);

  const seed = JSON.parse(await page.locator('body').innerText());
  await page.evaluate(token => {
    sessionStorage.setItem('id_token', token);
  }, seed.idToken);
  await page.addInitScript(token => {
    sessionStorage.setItem('id_token', token);
  }, seed.idToken);

  return seed;
}

/** @type {Awaited<ReturnType<typeof loadFixture>> | undefined} */
let fixture;

test.describe.serial('seeded dendrite fixture', () => {
  test.beforeEach(async ({ page }) => {
    fixture = await loadFixture(page);
  });

  test('moderation can approve the seeded story and move to the next page', async ({
    page,
  }) => {
    const response = await page.goto('/mod.html', { waitUntil: 'domcontentloaded' });

    expect(response, 'navigation response').not.toBeNull();
    expect(response!.status()).toBe(200);

    await expectSharedChrome(page);
    await expect(page).toHaveTitle('Dendrite - Moderate a story page');

    const pageContent = page.locator('#pageContent');
    await expect(page.locator('body')).toHaveClass(/authed/);
    await expect(page.locator('#approveBtn')).toBeEnabled();
    await expect(page.locator('#rejectBtn')).toBeEnabled();
    await expect(pageContent).toContainText(fixture.moderation.firstContent);

    await page.getByRole('button', { name: 'Approve' }).click();

    await expect(pageContent).toContainText(fixture.moderation.secondContent);
  });

  test('admin can generate fresh stats from the seeded datastore', async ({
    page,
  }) => {
    const response = await page.goto('/admin.html', {
      waitUntil: 'domcontentloaded',
    });

    expect(response, 'navigation response').not.toBeNull();
    expect(response!.status()).toBe(200);

    await expectSharedChrome(page);

    const adminContent = page.locator('#adminContent');
    await expect(adminContent).toBeVisible();
    await page.getByRole('button', { name: 'Generate stats' }).click();
    await expect(page.locator('#renderStatus')).toContainText('Stats generated');

    const statsResponse = await page.goto('/stats.html', {
      waitUntil: 'domcontentloaded',
    });

    expect(statsResponse, 'stats response').not.toBeNull();
    expect(statsResponse!.status()).toBe(200);

    await expectSharedChrome(page);
    await expect(page).toHaveTitle('Dendrite stats');
    await expect(page.locator('main')).toContainText(
      `Number of stories: ${fixture.expectedStatsAfterModeration.storyCount}`
    );
    await expect(page.locator('main')).toContainText(
      `Number of pages: ${fixture.expectedStatsAfterModeration.pageCount}`
    );
    await expect(page.locator('main')).toContainText(
      `Number of unmoderated pages: ${fixture.expectedStatsAfterModeration.unmoderatedPageCount}`
    );
    await expect(page.locator('#topStories')).toContainText(fixture.storyTitle);
  });

  test('contents and story pages navigate through the seeded mock content', async ({
    page,
  }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

    expect(response, 'navigation response').not.toBeNull();
    expect(response!.status()).toBe(200);

    await expectSharedChrome(page);
    await expect(page).toHaveTitle('Dendrite');
    await expect(page.locator('main')).toContainText('Contents');
    await page.getByRole('link', { name: fixture.storyTitle }).click();

    await expect(page).toHaveURL(/\/p\/1a\.html$/);
    await expect(page.locator('main')).toContainText(
      fixture.moderation.firstContent
    );
    await page.getByRole('link', { name: fixture.story.optionText }).click();

    await expect(page).toHaveURL(/\/p\/2a\.html$/);
    await expect(page.locator('main')).toContainText(fixture.moderation.secondContent);
  });
});
