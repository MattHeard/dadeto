# Common core coverage

- Source: `src/core/commonCore.js`
- Evidence: `npx jest test/core/commonCore.test.js test/core/commonCore.coverage.additional.test.js --runInBand --coverage --collectCoverageFrom=src/core/commonCore.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites passed, 44 tests passed, and statements, branches, functions, and lines are all 100%.
