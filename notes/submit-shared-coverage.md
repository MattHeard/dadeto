# Cloud submit-shared coverage

- Target: `src/core/cloud/submit-shared.js`
- Evidence: `npx jest test/core/cloud/submit-shared.test.js test/core/cloud/submit-shared.coverage.additional.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/submit-shared.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites and 18 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
