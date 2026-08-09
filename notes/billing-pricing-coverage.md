# Billing pricing facade coverage

- Target: `src/core/cloud/billing/pricing.js`
- Evidence: `npx jest test/core/cloud/billing/pricing.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/billing/pricing.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 1 test passed; statements, branches, functions, and lines each reached 100% without exclusions.
