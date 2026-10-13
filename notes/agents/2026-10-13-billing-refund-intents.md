# Billing refund intent reservation

- Unexpected hurdle: the billing runtime had refund application and pricing helpers but no durable request identity to bind a later Stripe refund event to.
- Diagnosis: `applyRefundEvent` could reverse the remaining lot using only a payment-intent match, while webhook-originated refunds were classified as unmatched. Issuing multiple refund requests for one purchase also needed an atomic guard.
- Fix: added transactional `createRefundIntent`, which quotes the unused refundable lot, persists the Stripe payment-intent and pricing snapshot identifiers, returns the existing intent on an idempotent retry, and reserves one active intent on the purchase without changing credit balances or lots.
- Evidence: `node scripts/run-jest.js --runInBand test/core/cloud/billing/billing-runtime-core.test.js` passed (1 suite, 34 tests), including a persisted-intent retry while current pricing is unavailable; targeted ESLint, `npm run tsdoc:check`, and `git diff --check` passed.
- Next guidance: connect this runtime operation to a permission-checked refund endpoint and Stripe refund adapter; update intent status for Stripe failures and confirmed events, bind `charge.refunded` to the exact intent before reversing credits, and clear the active reservation only on a terminal outcome. Add deferred-event replay as a separate bounded slice.
