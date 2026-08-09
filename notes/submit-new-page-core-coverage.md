# Submit new page core coverage

- Target: `src/core/cloud/submit-new-page/submit-new-page-core.js`
- Evidence: `npx jest test/core/cloud/submit-new-page/core.test.js test/core/cloud/submit-new-page/helpers.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/submit-new-page/submit-new-page-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites and 21 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
