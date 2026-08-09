# Get API key credit snapshot coverage

- Source: `src/core/cloud/get-api-key-credit-v2/get-api-key-credit-snapshot.js`
- Evidence: `npx jest test/core/cloud/get-api-key-credit-v2/handler.test.js test/core/cloud/get-api-key-credit-v2/core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/get-api-key-credit-v2/get-api-key-credit-snapshot.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites passed, 61 tests passed, and statements, branches, functions, and lines are all 100%.
