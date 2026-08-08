# Checkout runtime coverage

- Added focused tests for package resolution, dependency adapters, database persistence, and all idempotency outcomes.
- The remaining uncovered paths were the invalid package/snapshot cases, missing records, mapping writes, and idempotency conflict/incomplete/success branches.
- Focused Jest coverage reports 100% statements, branches, functions, and lines for `src/core/cloud/create-checkout-session/runtime-core.js`.
