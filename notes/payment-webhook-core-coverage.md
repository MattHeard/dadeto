# Payment webhook core coverage

- Source: `src/core/payment-webhook-core.js`
- Evidence: `npx jest test/core/cloud/payment-webhook/payment-webhook-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/payment-webhook-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 16 tests passed, and statements, branches, functions, and lines are all 100%.
