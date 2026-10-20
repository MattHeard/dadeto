# Production rental-search smoke runner

## Unexpected hurdle

The first full fast-check output exceeded the visible tool output limit, so the
terminal state had to be confirmed by polling the original process session
rather than treating truncated output as completion.

## Diagnosis and fix

Rank 4 Section E had offline provenance validation but no reusable browser
check for the deployed rental page and function. Added an opt-in smoke runner
that compares the page endpoint with the public canonical registry, checks
preflight CORS, submits a valid search through Chromium, and verifies an
invalid-input request fails with HTTP 400. The default invocation is inert;
mocked regressions verify it sends no network or browser requests without
`--execute`. Output includes status codes and hosts only, never response bodies
or function URLs.

The valid search is read-only: it queries Firestore commitments and the GCS
schedule. No production request was sent because Section E requires separate
authorization for live verification. Keep `--execute` gated until that
authorization is recorded.

## Evidence

- `node --check scripts/smoke-production-rental-search.js` passed.
- `node --check test/scripts/smoke-production-rental-search.test.js` passed.
- Focused Jest: `test/scripts/smoke-production-rental-search.test.js` passed (1
  suite, 4 tests).
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 DADETO_JEST_POOL_DIR=.tmp/jest-pool-rank4 npm run check`
  passed all 10 fast local gates, including five impact shards, lint, dependency
  checks, parse boundaries, duplication (0 clones), TSDoc, and audit (0
  vulnerabilities). This local command is not the authoritative full-coverage
  check.
- `git diff --check` passed.

## Next-time guidance

The runner only prepares the live evidence step; it does not establish current
production health. After separate authorization, execute the smoke, retain the
redacted output and command result, then report the production observation on
the Rank 4 Notion page and owning Bead.

## Authorized production verification — 2026-10-20

The first authorized run exposed a false failure: the registry value omits a
trailing slash, while Playwright normalizes the response URL to include one.
Comparing URL `.href` values preserves the canonical endpoint check. The next
run showed that browser JavaScript cannot read the `Access-Control-Allow-Origin`
response header. The smoke now checks whether the browser fetch succeeded and
uses Playwright's response headers to verify the exact allowed origin, including
for the invalid-input response.

The corrected production smoke passed: registry HTTP 200, page HTTP 200,
preflight HTTP 204, valid browser search HTTP 200, and invalid `{}` HTTP 400
with `valid: false` and the configured origin. The valid search reads Firestore
commitments and the GCS schedule; it does not create a reservation. Output
contains statuses and hosts only. The smoke runner regression suite passes
(1 suite, 6 tests). The final timestamped smoke run succeeded from
`2026-10-20T07:28:19Z` to `2026-10-20T07:28:22Z`. `npm run check` passed all
10 local gates after the runner correction; duplication found 0 clones.
