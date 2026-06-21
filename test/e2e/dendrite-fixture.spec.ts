import { test, expect, type APIRequestContext } from '@playwright/test';
import { expectSharedChrome } from './static-pages.helpers';

const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';
const FIREBASE_AUTH_MODULE =
  'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
const FIREBASE_APP_MODULE =
  'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';

/**
 * Keep cloud E2E focused on Dendrite by replacing Firebase browser SDK imports
 * with the smallest auth surface the admin/moderation pages need.
 * @param {import('@playwright/test').Page} page Playwright page.
 * @returns {Promise<void>} Resolves after route stubs are installed.
 */
async function stubFirebaseBrowserModules(page) {
  await page.route(FIREBASE_APP_MODULE, route =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'export function initializeApp(config) { return { config }; }',
    })
  );
  await page.route(FIREBASE_AUTH_MODULE, route =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
        const currentUser = {
          uid: ${JSON.stringify(ADMIN_UID)},
          getIdToken: async () => sessionStorage.getItem('id_token'),
        };
        export function getAuth() { return { currentUser }; }
        export const GoogleAuthProvider = { credential: token => token };
        export function onAuthStateChanged(auth, callback) {
          callback(auth?.currentUser || currentUser);
          return () => {};
        }
        export async function signInWithCredential() {}
      `,
    })
  );
}

/**
 * Load the seeded fixture manifest and make the admin token available to the browser.
 * @param {import('@playwright/test').Page} page Playwright page.
 * @param {APIRequestContext} request Playwright request context.
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
async function loadFixture(page, request: APIRequestContext) {
  await stubFirebaseBrowserModules(page);

  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is required for dendrite fixture e2e tests');
  }

  const seed = await (
    await request.get(new URL('/seed.json', apiBaseUrl).toString())
  ).json();
  await page.context().addInitScript(token => {
    sessionStorage.setItem('id_token', token);
  }, seed.idToken);
  await page.addInitScript(token => {
    sessionStorage.setItem('id_token', token);
  }, seed.idToken);

  return seed;
}

function getPageBaseUrl() {
  const pageBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL;
  if (!pageBaseUrl) {
    throw new Error(
      'PLAYWRIGHT_BASE_URL or BASE_URL is required for dendrite fixture e2e tests',
    );
  }

  return pageBaseUrl;
}

/**
 * Navigate to a same-origin page, verify the seeded token is present there, and
 * then load the authenticated surface under test.
 * @param {import('@playwright/test').Page} page Playwright page.
 * @param {string} path Authenticated path to visit.
 * @param {string} token Seeded admin ID token.
 */
async function gotoAuthenticated(page, path, token) {
  await page.goto(new URL('/seed.json', getPageBaseUrl()).toString(), {
    waitUntil: 'domcontentloaded',
  });
  await page.evaluate(idToken => {
    sessionStorage.setItem('id_token', idToken);
  }, token);
  await expect
    .poll(
      () =>
        page.evaluate(() => sessionStorage.getItem('id_token')?.length ?? 0),
      { message: 'seeded id token is available on the browser origin' }
    )
    .toBeGreaterThan(0);

  await page.goto(new URL(path, getPageBaseUrl()).toString(), {
    waitUntil: 'domcontentloaded',
  });
}

/**
 * Capture a compact page/auth snapshot for cloud-only failures.
 * @param {import('@playwright/test').Page} page Playwright page.
 * @returns {Promise<{
 *   bodyClass: string,
 *   hasApproveButton: boolean,
 *   hasToken: boolean,
 *   href: string,
 *   title: string,
 * }>} Debug state.
 */
async function readAuthDebugState(page) {
  return page.evaluate(() => ({
    bodyClass: document.body.className,
    hasApproveButton: Boolean(document.querySelector('#approveBtn')),
    hasToken: Boolean(sessionStorage.getItem('id_token')),
    href: location.href,
    title: document.title,
  }));
}

/** @type {Awaited<ReturnType<typeof loadFixture>> | undefined} */
let fixture;

test.describe.serial('seeded dendrite fixture', () => {
  test.beforeEach(async ({ page, request }) => {
    page.on('pageerror', error => {
      console.log(`[dendrite-fixture pageerror] ${error.message}`);
    });
    page.on('requestfailed', failedRequest => {
      const failure = failedRequest.failure();
      console.log(
        `[dendrite-fixture requestfailed] ${failedRequest.method()} ${failedRequest.url()} ${
          failure?.errorText ?? 'unknown failure'
        }`
      );
    });
    page.on('response', async response => {
      const status = response.status();
      if (status >= 400) {
        console.log(
          `[dendrite-fixture response.${status}] ${response.request().method()} ${response.url()}`
        );
        if (status >= 500) {
          const body = await response.text().catch(() => '');
          console.log(
            `[dendrite-fixture response.${status}.body] ${body.slice(0, 500)}`
          );
        }
      }
    });
    page.on('console', message => {
      if (message.type() === 'error') {
        console.log(`[dendrite-fixture console.error] ${message.text()}`);
      }
    });
    fixture = await loadFixture(page, request);
  });

  test('moderation can approve the seeded story and move to the next page', async ({
    page,
  }) => {
    await gotoAuthenticated(page, '/mod.html', fixture.idToken);

    await expectSharedChrome(page);
    await expect(page).toHaveTitle('Dendrite - Moderate a story page');
    console.log(
      `[dendrite-fixture auth-debug-after-navigation] ${JSON.stringify(
        await readAuthDebugState(page)
      )}`
    );

    const pageContent = page.locator('#pageContent');
    await expect
      .poll(() => readAuthDebugState(page), {
        message: 'moderation page reaches authenticated state',
      })
      .toMatchObject({ bodyClass: expect.stringMatching(/authed/) });
    await expect(page.locator('#approveBtn')).toBeEnabled();
    await expect(page.locator('#rejectBtn')).toBeEnabled();
    await expect(pageContent).toContainText(fixture.moderation.firstContent);

    await page.getByRole('button', { name: 'Approve' }).click();

    await expect(pageContent).toContainText(fixture.moderation.secondContent, {
      timeout: 30000,
    });
  });

  test('admin can generate fresh stats from the seeded datastore', async ({
    page,
  }) => {
    await gotoAuthenticated(page, '/admin.html', fixture.idToken);

    await expectSharedChrome(page);

    const adminContent = page.locator('#adminContent');
    await expect(adminContent).toBeVisible();
    await page.getByRole('button', { name: 'Generate stats' }).click();
    await expect(page.locator('#renderStatus')).toContainText('Stats generated');

    await page.goto('/stats.html', {
      waitUntil: 'domcontentloaded',
    });

    await expectSharedChrome(page);
    await expect(page).toHaveTitle('Dendrite stats');
    await expect(page.locator('body > main')).toContainText(
      `Number of stories: ${fixture.expectedStatsAfterModeration.storyCount}`
    );
    await expect(page.locator('body > main')).toContainText(
      `Number of pages: ${fixture.expectedStatsAfterModeration.pageCount}`
    );
    await expect(page.locator('body > main')).toContainText(
      `Number of unmoderated pages: ${fixture.expectedStatsAfterModeration.unmoderatedPageCount}`
    );
    await expect(page.locator('#topStories')).toContainText(fixture.storyTitle);
  });

  test('contents and story pages navigate through the seeded mock content', async ({
    page,
  }) => {
    await expect(fixture.story.firstPagePath).toBe('/p/1a.html');
    await expect(fixture.story.secondPagePath).toBe('/p/2a.html');
    await expect(fixture.story.optionText).toBe('Continue to the second page');
    await expect(fixture.moderation.firstContent).toContain(
      'invites the reader forward'
    );
    await expect(fixture.moderation.secondContent).toContain(
      'closes the loop'
    );
  });
});
