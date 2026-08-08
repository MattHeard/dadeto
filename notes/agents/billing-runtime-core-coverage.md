# Billing runtime core coverage

- Added accessor, payment, charge, refund, lot, and default-runtime path tests.
- Exposed the internal transaction-lot reader through a test utility so both present and missing transaction snapshots are directly verified.
- Verified with `npx jest test/core/cloud/billing/billing-runtime-core.test.js --no-cache --watchman=false --runInBand --coverage --coverageProvider=babel --collectCoverageFrom=src/core/cloud/billing/billing-runtime-core.js --coverageReporters=text`.
- Focused report: `src/core/cloud/billing/billing-runtime-core.js` reached 100% statements, branches, functions, and lines.
