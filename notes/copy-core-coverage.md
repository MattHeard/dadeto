# Copy core coverage

- Source: `src/core/build/copy.js`
- Evidence: `npx jest test/core/cloud/copy.test.js --runInBand --coverage --collectCoverageFrom=src/core/build/copy.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 12 tests passed, and statements, branches, functions, and lines are all 100%.
