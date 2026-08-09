# Payment webhook core coverage

- Target: `src/core/cloud/payment-webhook/payment-webhook-core.js`
- Evidence: `npx jest test/core/cloud/payment-webhook/payment-webhook-wrapper.coverage.test.js test/cloud/payment-webhook/index.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/payment-webhook/payment-webhook-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites and 3 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
