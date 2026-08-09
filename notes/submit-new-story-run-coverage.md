# Submit new story runtime coverage

- Source: `src/core/cloud/submit-new-story/run.js`
- Evidence: `npx jest test/core/cloud/submit-new-story/run.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/submit-new-story/run.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 8 tests passed, and statements, branches, functions, and lines are all 100%.
