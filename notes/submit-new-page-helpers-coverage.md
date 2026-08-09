# Submit new page helpers coverage

- Source: `src/core/cloud/submit-new-page/helpers.js`
- Evidence: `npx jest test/core/cloud/submit-new-page/helpers.test.js test/core/cloud/submit-new-page/helpers-facade.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/submit-new-page/helpers.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites passed, 7 tests passed, and statements, branches, functions, and lines are all 100%.
