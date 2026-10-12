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

## Purchase settlement transaction boundary

- Unexpected hurdle: passing the transaction capability and runner as separate arguments made the refund helper exceed the repo's four-parameter limit and triggered the parameter-bag arity-smuggling rule.
- Diagnosis: the permission and runner form one request-scoped transaction capability, so the helper needs one named context object rather than extra positional arguments.
- Chosen fix: payment-webhook now requires a permission-first `runPurchaseTransaction` adapter for paid, refund, and expiry flows; those core paths have no direct `db.runTransaction` fallback and fail closed if the runner is absent. The refund helper receives the capability and runner together as `PurchaseTransactionScope`.
- Evidence: focused payment-webhook/billing Jest passed (4 suites / 39 tests); ESLint and JSDoc passed; `npm run build:cloud` passed; configured elevated `npm run check` passed all 10 gates, including E2E, 0 clones, and 0 audit vulnerabilities.
- Next: continue with the remaining billing operation transaction paths (`chargeOperation`, `reserveOperation`, `resolveOperation`) and other injected raw Firestore mutation commands.

## Billing operation transaction boundary

- Unexpected hurdle: generalizing the purchase runner initially left the operation helper referring to a removed `db` parameter; the focused suite exposed the reference immediately. A first added capability regression also used a billing-disabled runtime, so neither operation exercised the adapter.
- Diagnosis: operation transaction setup needs the database, permission, and runner together as a request-scoped `BillingTransactionScope`; tests that target the transaction seam must enable billing and prove multiple public operations reach it.
- Chosen fix: introduce one required `runBillingTransaction` adapter for billing persistence; route purchase settlement, refund, expiry, charge, reservation, and resolution transactions through it. Add `AllowEffects` as the first argument to operation methods and retain `db` in the scoped transaction context for lot discovery. Wire the cloud adapter into each production billing runtime composition.
- Evidence: focused billing/payment-webhook Jest passed (4 suites / 41 tests); ESLint, JSDoc, and `non-core-thin` passed; source inspection found no direct `db.runTransaction` in shared billing core; `npm run build:cloud` passed; configured elevated full `npm run check` passed all 10 gates, including coverage, E2E, 0 clones, and 0 audit vulnerabilities. The final log is `/tmp/dadeto-billing-operation-check-final.log`.
- Next: audit billing transaction callbacks for direct mutation methods that may need narrower effect adapters, then continue the active Notion specification queue in rank order.
