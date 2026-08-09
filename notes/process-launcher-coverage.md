# Process launcher coverage

- Source: `src/core/local/process-launcher.js`
- Evidence: `npx jest test/core/local/process-launcher.test.js test/core/local/process-launcher.coverage.additional.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/process-launcher.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites passed, 8 tests passed, and statements, branches, functions, and lines are all 100%.
