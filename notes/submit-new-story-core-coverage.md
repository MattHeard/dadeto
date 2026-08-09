# Submit new story core coverage

- Source: `src/core/cloud/submit-new-story/submit-new-story-core.js`
- Evidence: `npx jest test/core/cloud/submit-new-story-core.branch.test.js test/core/cloud/submit-new-story/submit-new-story-core.branch.test.js test/core/cloud/submit-new-story/submit-new-story-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/submit-new-story/submit-new-story-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 3 suites passed, 43 tests passed, and statements, branches, functions, and lines are all 100%.
