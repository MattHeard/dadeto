# Payment webhook core facade coverage

- Target: `src/core/payment-webhook-core.js`
- Evidence: `npx jest test/core/cloud/payment-webhook/payment-webhook-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/payment-webhook-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 16 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
