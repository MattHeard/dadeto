# Payment webhook startup Firestore boundary

- Unexpected hurdle: the first focused Jest invocation waited on the machine-wide pool, and the first full check was blocked by sandbox `EPERM` errors and unavailable npm audit networking.
- Diagnosis: Jest needed the repository-local pool directory; the full check needed elevated execution for child Node processes and audit access.
- Chosen fix: construct the payment webhook Firestore client only inside a startup `AllowEffects` boundary, require the resulting database in the core wrapper, and cover both configured/default database selection plus the missing-database rejection.
- Evidence: focused payment-webhook tests passed (3 suites, 7 tests); `npm run build:cloud` passed; elevated configured `npm run check` passed all 10 gates, including full coverage, local E2E, 0 clones, and 0 audit vulnerabilities.
- Next: audit request-time payment webhook billing persistence for raw Firestore command access and route each mutation through narrowly scoped permission-first adapters.
- Next-time guidance: use `DADETO_JEST_POOL_DIR` and `TMPDIR` under the repository-local `.tmp`; classify process/network `EPERM` separately from code failures before changing implementation.
