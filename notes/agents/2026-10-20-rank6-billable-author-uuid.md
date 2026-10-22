# Rank 6: billable author UUID operation

This loop adds the opt-in billing boundary to the existing authenticated `get-author-uuid-v2` operation. The deployed default stays free unless `BILLING_ENABLED` is true.

## Diagnosis and fix

- `createBillingRuntime` already had transactional reserve and resolve methods, but no deployed function called them.
- `get-author-uuid-v2` is authenticated, has a stable result, and maps the Firebase UID to the billing identity through `api-key-ownership/{uid}`. The operation type and pricing lookup are fixed on the server.
- Billing requests now require an idempotency key, reserve credits before reading or writing the author UUID, and settle after success. Retries return the stored UUID without repeating the write. Uncertain write outcomes move the reservation to recovery instead of executing again.
- Billing, author reads, writes, and response adapters keep their effect capability at the boundary. No production data or live Firebase identity was used.

## Hurdles and guidance

- The first fast check exposed JSDoc errors, the 50-line limit for cloud wrappers, and exact duplicate blocks. The code was split into small billing and response helpers; the final scoped check reports zero clones and complete changed-core coverage.
- `npm run build:cloud` also refreshed unrelated generated files under `infra/`; those four unrelated copies were restored. Verify the new core and cloud adapters exist in the generated `get-author-uuid-v2` package after future packaging changes.
- This loop deliberately stops before test-credit seeding and gcp-test Playwright wiring. Continue test-database credit seeding and gcp-test Playwright wiring in follow-up Bead `dadeto-xl0j`; production billing remains inactive unless its existing feature flag is enabled.

## Evidence

- `npm run check:impact:run -- --files src/core/cloud/get-author-uuid-v2/get-author-uuid-v2-core.js src/core/cloud/get-author-uuid-v2/billable-operation.js src/core/cloud/get-author-uuid-v2/response.js src/cloud/get-author-uuid-v2/index.js src/cloud/get-author-uuid-v2/effect-adapters.js src/cloud/get-author-uuid-v2/billing-runtime.js test/core/cloud/get-author-uuid-v2/get-author-uuid-v2-core.test.js test/core/cloud/get-author-uuid-v2/billable-operation.test.js test/cloud/get-author-uuid-v2/effect-adapters.test.js test/cloud/get-author-uuid-v2/index.test.js` — passed; 4 suites, 28 tests, all changed-core lines and branches covered, ESLint/core-parse/duplication passed.
- `npm run check` — passed all 10 fast local gates; 4 suites and 28 impact-selected tests passed. This is not full coverage evidence.
- `npm run build:cloud` — passed (exit 0); generated package contains the billable core, response helper, billing runtime, and effect adapters.
- `gh pr checks 2746` — could not read the separate Rank 5 PR checks because `api.github.com` was unreachable. Rank 6 still needs its own pushed CI run.
