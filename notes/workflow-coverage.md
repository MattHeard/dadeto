# Local workflow coverage

- Source: `src/core/local/workflow.js`
- Evidence: `npx jest test/core/local/workflow.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/workflow.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 6 tests passed, and statements, branches, functions, and lines are all 100%.
