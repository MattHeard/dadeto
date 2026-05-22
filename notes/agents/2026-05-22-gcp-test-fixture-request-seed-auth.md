# 2026-05-22 - gcp-test fixture seed auth

## Unexpected hurdle

The GCP Playwright run reached the seeded moderation page after earlier asset fixes, but `/mod.html` still never added the `authed` body class.

## Diagnosis path

Run `26281345950` showed the new-story cases passing and only the seeded moderation fixture failing. That narrowed the problem away from static asset serving and back to how the test prepared the browser auth token before loading moderation/admin pages.

## Chosen fix

The fixture now reads `/seed.json` through Playwright's request context instead of first navigating the browser page there. It installs the seeded admin token with `page.addInitScript` before the first real browser navigation, so `/mod.html` and `/admin.html` receive `sessionStorage.id_token` at document start.

## Next-time guidance

For cloud E2E setup data, prefer request-context fetches over setup-page navigations. That keeps the browser page lifecycle reserved for the app page under test and avoids origin/session timing ambiguity.
