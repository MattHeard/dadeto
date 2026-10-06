# Production error repair, 2026-10-06

## Unexpected hurdle

Cloud Scheduler reserves `X-Appengine-*` headers. The stats handler relied on
`X-Appengine-Cron: true` to bypass Firebase admin authentication, while the
production job repeatedly returned `UNAUTHENTICATED`.

## Diagnosis and fix

- Browser toy modules imported `src/core/object-minute-rental-search` but the
  static build copied only `core/browser`, root core modules, and constants.
  Add the shared search module tree to the static copy plan. The build now emits
  `public/core/object-minute-rental-search/search-core.js`; importing the built
  entry resolves its relative modules.
- Replace the spoofable cron-header bypass with verification of a Cloud
  Scheduler OIDC token whose audience and verified service-account email match
  Terraform configuration. Keep the existing Firebase admin-token path for
  manual requests. Terraform gives the scheduler a dedicated service account
  and OIDC target token.
- `src/cloud/submit-new-page/index.js` omitted `createHandleSubmit` from the
  runtime dependency object. Pass it through and guard the entrypoint with a
  regression test.
- Test cleanup attempted to delete a scheduler job that Terraform had not
  created. List jobs first, delete the named job only when present, and allow
  listing/deletion errors to fail cleanup.
- The first deployment-gate run failed while seeding test content because the
  fixture did not inject the newly required `bindEffectBoundary`. Import the
  trusted boundary in `scripts/gcp-test-fixture.js` and pass it explicitly.
  The corrected retry then exposed a second required dependency,
  `effectFetchFn`; inject a no-op success transport so the fixture does not
  issue real CDN invalidation requests.

## Evidence and next-time guidance

- Focused regression set: 7 suites, 103 tests passed.
- `npm run build` and `npm run build:cloud` passed. The static search core is
  present and its import graph resolves.
- `npm run check` reached 100% coverage and all ten non-test checks passed.
  Its test step remains red because local Playwright reported page crashes in
  two Chronoflow scenarios and the static rental search scenario; eight other
  E2E scenarios passed. Follow up on that separately.
- Local Terraform validation is intentionally restricted to formatting; run
  Terraform plan/apply through the repository GitHub workflows.
- Fixture regression: `npx jest test/scripts/gcp-test-fixture.test.js
  --runInBand` passed (4 tests) after injecting the effect boundary. The first
  `gcp-test` attempt failed at seed setup for this missing dependency and
  cleaned up its temporary infrastructure. Retry then confirmed that
  `effectFetchFn` must also be injected; the fixture now supplies a no-op
  success transport and the regression asserts both dependencies.
- After publishing, verify the search dependency URL returns HTTP 200 and force
  one production stats scheduler execution; close the production beads only
  after both are confirmed.
