# Parallel utils coverage

- Source: `src/core/cloud/parallel-utils.js`
- Evidence: `npx jest test/core/cloud/parallel-utils.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/parallel-utils.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 2 tests passed, and statements, branches, functions, and lines are all 100%.
