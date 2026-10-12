# Payment webhook startup Firestore boundary

- Unexpected hurdle: the first focused Jest invocation waited on the machine-wide pool, and the first full check was blocked by sandbox `EPERM` errors and unavailable npm audit networking.
- Diagnosis: Jest needed the repository-local pool directory; the full check needed elevated execution for child Node processes and audit access.
- Chosen fix: construct the payment webhook Firestore client only inside a startup `AllowEffects` boundary, require the resulting database in the core wrapper, and cover both configured/default database selection plus the missing-database rejection.
- Evidence: focused payment-webhook tests passed (3 suites, 7 tests); `npm run build:cloud` passed; elevated configured `npm run check` passed all 10 gates, including full coverage, local E2E, 0 clones, and 0 audit vulnerabilities.
- Next: audit request-time payment webhook billing persistence for raw Firestore command access and route each mutation through narrowly scoped permission-first adapters.
- Next-time guidance: use `DADETO_JEST_POOL_DIR` and `TMPDIR` under the repository-local `.tmp`; classify process/network `EPERM` separately from code failures before changing implementation.

## Refund reconciliation persistence follow-up

- Unexpected hurdle: the first full check after adding the writer failed `non-core-thin` because `effect-adapters.js` reached 51 lines against the 50-line limit.
- Diagnosis: the new reconciliation writer was a separate adapter concern that pushed an existing shared adapter file over its bound.
- Chosen fix: extracted `createRefundReconciliationWriter` into `refund-reconciliation-effect-adapter.js`; payment-webhook now requires this permission-first writer and passes it to `createBillingRuntime`, which forwards the request capability and record. The shared billing runtime has no raw Firestore fallback and throws if the adapter is missing.
- Evidence: focused billing/payment-webhook Jest passed (4 suites / 40 tests); JSDoc passed; `npm run non-core-thin` passed at 295 files; `npm run build:cloud` passed; configured elevated `npm run check` passed all 10 gates, including E2E, 0 clones, and 0 audit vulnerabilities.
- Next: move the remaining transactional billing writes behind request-scoped persistence adapters; this loop only externalized unmatched-refund reconciliation.
