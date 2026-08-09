# Get API key credit v2 core coverage

- Target: `src/core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js`
- Evidence: `npx jest test/core/cloud/get-api-key-credit-v2/core.test.js test/core/cloud/get-api-key-credit-v2/handler.test.js test/core/cloud/get-api-key-credit-v2/common-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 3 suites and 62 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
