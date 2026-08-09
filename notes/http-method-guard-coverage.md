# Cloud HTTP method guard coverage

- Target: `src/core/cloud/http-method-guard.js`
- Evidence: `npx jest test/core/cloud/http-method-guard.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/http-method-guard.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 11 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
