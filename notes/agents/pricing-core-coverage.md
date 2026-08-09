# Pricing core coverage

- Added tests for invalid pricing inputs, invalid operation rates, minimum operation charges, package validation, and existing quote behavior.
- Focused Jest coverage reports 100% statements, branches, functions, and lines for `src/core/cloud/billing/pricing-core.js`.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/billing/pricing-core.test.js test/core/cloud/billing/pricing.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/billing/pricing-core.js' --coverageReporters=text-summary` — 2 suites, 4 tests passed; statements 21/21, branches 11/11, functions 6/6, lines 20/20.
