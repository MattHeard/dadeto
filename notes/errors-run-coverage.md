# Cloud errors runtime coverage

- Target: `src/core/cloud/errors/run.js`
- Evidence: `npx jest test/core/cloud/errors/run.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/errors/run.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 12 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
