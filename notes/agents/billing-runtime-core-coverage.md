# Billing runtime core coverage

- Added accessor, payment, charge, refund, lot, and default-runtime path tests.
- Exposed the internal transaction-lot reader through a test utility so both present and missing transaction snapshots are directly verified.
- Verified with `npx jest test/core/cloud/billing/billing-runtime-core.test.js --no-cache --watchman=false --runInBand --coverage --coverageProvider=babel --collectCoverageFrom=src/core/cloud/billing/billing-runtime-core.js --coverageReporters=text`.
- Focused report: `src/core/cloud/billing/billing-runtime-core.js` reached 100% statements, branches, functions, and lines.

## Follow-up verification

- Fixed the ESM test harness by importing `jest` from `@jest/globals`; the focused billing suite then passed completely.
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/billing --runInBand --coverage --silent --coverageDirectory=/tmp/dadeto-billing-cov --collectCoverageFrom='src/core/cloud/billing/billing-runtime-core.js' --coverageReporters=text-summary --coverageReporters=json` — 6 suites, 26 tests passed; statements 124/124, branches 71/71, functions 30/30, lines 113/113.
