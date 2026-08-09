# Get API key credit v2 common core coverage

- Target: `src/core/cloud/get-api-key-credit-v2/common-core.js`
- Evidence: `npx jest test/core/cloud/get-api-key-credit-v2/common-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/get-api-key-credit-v2/common-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 1 test passed; statements, branches, functions, and lines each reached 100% without exclusions.
