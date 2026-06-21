# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dendrite-fixture.spec.ts >> seeded dendrite fixture >> moderation can approve the seeded story and move to the next page
- Location: test/e2e/dendrite-fixture.spec.ts:179:3

# Error details

```
Error: PLAYWRIGHT_BASE_URL or BASE_URL is required for dendrite fixture e2e tests
```

# Test source

```ts
  1   | import { test, expect, type APIRequestContext } from '@playwright/test';
  2   | import { expectSharedChrome } from './static-pages.helpers';
  3   | 
  4   | const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';
  5   | const FIREBASE_AUTH_MODULE =
  6   |   'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
  7   | const FIREBASE_APP_MODULE =
  8   |   'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
  9   | 
  10  | /**
  11  |  * Keep cloud E2E focused on Dendrite by replacing Firebase browser SDK imports
  12  |  * with the smallest auth surface the admin/moderation pages need.
  13  |  * @param {import('@playwright/test').Page} page Playwright page.
  14  |  * @returns {Promise<void>} Resolves after route stubs are installed.
  15  |  */
  16  | async function stubFirebaseBrowserModules(page) {
  17  |   await page.route(FIREBASE_APP_MODULE, route =>
  18  |     route.fulfill({
  19  |       contentType: 'application/javascript',
  20  |       body: 'export function initializeApp(config) { return { config }; }',
  21  |     })
  22  |   );
  23  |   await page.route(FIREBASE_AUTH_MODULE, route =>
  24  |     route.fulfill({
  25  |       contentType: 'application/javascript',
  26  |       body: `
  27  |         const currentUser = {
  28  |           uid: ${JSON.stringify(ADMIN_UID)},
  29  |           getIdToken: async () => sessionStorage.getItem('id_token'),
  30  |         };
  31  |         export function getAuth() { return { currentUser }; }
  32  |         export const GoogleAuthProvider = { credential: token => token };
  33  |         export function onAuthStateChanged(auth, callback) {
  34  |           callback(auth?.currentUser || currentUser);
  35  |           return () => {};
  36  |         }
  37  |         export async function signInWithCredential() {}
  38  |       `,
  39  |     })
  40  |   );
  41  | }
  42  | 
  43  | /**
  44  |  * Load the seeded fixture manifest and make the admin token available to the browser.
  45  |  * @param {import('@playwright/test').Page} page Playwright page.
  46  |  * @param {APIRequestContext} request Playwright request context.
  47  |  * @returns {Promise<{
  48  |  *   idToken: string,
  49  |  *   storyTitle: string,
  50  |  *   moderation: { firstContent: string, secondContent: string },
  51  |  *   story: { firstPagePath: string, secondPagePath: string, optionText: string },
  52  |  *   expectedStatsAfterModeration: {
  53  |  *     storyCount: number,
  54  |  *     pageCount: number,
  55  |  *     unmoderatedPageCount: number,
  56  |  *   },
  57  |  * }>} Seeded fixture manifest.
  58  |  */
  59  | async function loadFixture(page, request: APIRequestContext) {
  60  |   await stubFirebaseBrowserModules(page);
  61  | 
  62  |   const pageBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL;
  63  |   if (!pageBaseUrl) {
> 64  |     throw new Error(
      |           ^ Error: PLAYWRIGHT_BASE_URL or BASE_URL is required for dendrite fixture e2e tests
  65  |       'PLAYWRIGHT_BASE_URL or BASE_URL is required for dendrite fixture e2e tests',
  66  |     );
  67  |   }
  68  | 
  69  |   const seed = await (
  70  |     await request.get(new URL('/seed.json', pageBaseUrl).toString())
  71  |   ).json();
  72  |   await page.context().addInitScript(token => {
  73  |     sessionStorage.setItem('id_token', token);
  74  |   }, seed.idToken);
  75  |   await page.addInitScript(token => {
  76  |     sessionStorage.setItem('id_token', token);
  77  |   }, seed.idToken);
  78  | 
  79  |   return seed;
  80  | }
  81  | 
  82  | function getPageBaseUrl() {
  83  |   const pageBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL;
  84  |   if (!pageBaseUrl) {
  85  |     throw new Error(
  86  |       'PLAYWRIGHT_BASE_URL or BASE_URL is required for dendrite fixture e2e tests',
  87  |     );
  88  |   }
  89  | 
  90  |   return pageBaseUrl;
  91  | }
  92  | 
  93  | /**
  94  |  * Navigate to a same-origin page, verify the seeded token is present there, and
  95  |  * then load the authenticated surface under test.
  96  |  * @param {import('@playwright/test').Page} page Playwright page.
  97  |  * @param {string} path Authenticated path to visit.
  98  |  * @param {string} token Seeded admin ID token.
  99  |  */
  100 | async function gotoAuthenticated(page, path, token) {
  101 |   await page.goto(new URL('/seed.json', getPageBaseUrl()).toString(), {
  102 |     waitUntil: 'domcontentloaded',
  103 |   });
  104 |   await page.evaluate(idToken => {
  105 |     sessionStorage.setItem('id_token', idToken);
  106 |   }, token);
  107 |   await expect
  108 |     .poll(
  109 |       () =>
  110 |         page.evaluate(() => sessionStorage.getItem('id_token')?.length ?? 0),
  111 |       { message: 'seeded id token is available on the browser origin' }
  112 |     )
  113 |     .toBeGreaterThan(0);
  114 | 
  115 |   await page.goto(new URL(path, getPageBaseUrl()).toString(), {
  116 |     waitUntil: 'domcontentloaded',
  117 |   });
  118 | }
  119 | 
  120 | /**
  121 |  * Capture a compact page/auth snapshot for cloud-only failures.
  122 |  * @param {import('@playwright/test').Page} page Playwright page.
  123 |  * @returns {Promise<{
  124 |  *   bodyClass: string,
  125 |  *   hasApproveButton: boolean,
  126 |  *   hasToken: boolean,
  127 |  *   href: string,
  128 |  *   title: string,
  129 |  * }>} Debug state.
  130 |  */
  131 | async function readAuthDebugState(page) {
  132 |   return page.evaluate(() => ({
  133 |     bodyClass: document.body.className,
  134 |     hasApproveButton: Boolean(document.querySelector('#approveBtn')),
  135 |     hasToken: Boolean(sessionStorage.getItem('id_token')),
  136 |     href: location.href,
  137 |     title: document.title,
  138 |   }));
  139 | }
  140 | 
  141 | /** @type {Awaited<ReturnType<typeof loadFixture>> | undefined} */
  142 | let fixture;
  143 | 
  144 | test.describe.serial('seeded dendrite fixture', () => {
  145 |   test.beforeEach(async ({ page, request }) => {
  146 |     page.on('pageerror', error => {
  147 |       console.log(`[dendrite-fixture pageerror] ${error.message}`);
  148 |     });
  149 |     page.on('requestfailed', failedRequest => {
  150 |       const failure = failedRequest.failure();
  151 |       console.log(
  152 |         `[dendrite-fixture requestfailed] ${failedRequest.method()} ${failedRequest.url()} ${
  153 |           failure?.errorText ?? 'unknown failure'
  154 |         }`
  155 |       );
  156 |     });
  157 |     page.on('response', async response => {
  158 |       const status = response.status();
  159 |       if (status >= 400) {
  160 |         console.log(
  161 |           `[dendrite-fixture response.${status}] ${response.request().method()} ${response.url()}`
  162 |         );
  163 |         if (status >= 500) {
  164 |           const body = await response.text().catch(() => '');
```