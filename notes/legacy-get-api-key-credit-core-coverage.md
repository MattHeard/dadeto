# Legacy get API key credit core coverage

- Source: `src/core/cloud/get-api-key-credit/get-api-key-credit-core.js`
- Evidence: `npx jest test/core/cloud/get-api-key-credit/handler.test.js test/core/cloud/get-api-key-credit/utils.test.js test/core/cloud/get-api-key-credit/common-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/get-api-key-credit/get-api-key-credit-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 3 suites passed, 21 tests passed, and statements, branches, functions, and lines are all 100%.
