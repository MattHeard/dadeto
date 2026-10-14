# Billing expiry coverage gap

- Unexpected hurdle: CI `npm test` passed its test shards but failed the repository's exact branch-coverage threshold by two branches.
- Diagnosis: the merged coverage report pointed to missing-event handling and mismatched retries for already-expired purchases in the expiry transaction handler.
- Fix: add regression cases for a missing payment-event document and for an expiry retry whose event ID differs from the event that expired the purchase.
- Next time: inspect `reports/coverage/coverage-final.json` when the aggregate coverage gate fails despite passing shards; on this host, set `DADETO_CHECK_TIMEOUT_MS=3600000` for the full check because the default 30-minute task timeout is shorter than the serial test workflow.
- Evidence: `npx jest --runInBand --coverage=false test/core/cloud/billing/billing-runtime-core.test.js` passed (40 tests); `npm run test:unit` passed with lines/statements/functions/branches all at 100%; `DADETO_CHECK_TIMEOUT_MS=3600000 npm run check` passed (10 gates, 0 failures; 11 local E2E tests passed).
