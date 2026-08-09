# Get API key credit core coverage

- Target: `src/core/cloud/get-api-key-credit/get-api-key-credit-core.js`
- Evidence: `npx jest test/core/cloud/get-api-key-credit-core.branch.test.js test/core/cloud/get-api-key-credit/core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/get-api-key-credit/get-api-key-credit-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 9 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
