# Get API key credit v2 create-db coverage

- Target: `src/core/cloud/get-api-key-credit-v2/create-db.js`
- Evidence: `npx jest test/core/cloud/get-api-key-credit-v2/core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/get-api-key-credit-v2/create-db.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 37 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
