# Cloud errors core coverage

- Target: `src/core/cloud/errors/errors-core.js`
- Evidence: `npx jest test/core/cloud/errors/errors-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/errors/errors-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 10 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
