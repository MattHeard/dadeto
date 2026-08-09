# Submit moderation rating runtime coverage

- Source: `src/core/cloud/submit-moderation-rating/run.js`
- Evidence: `npx jest test/core/cloud/submit-moderation-rating/run.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/submit-moderation-rating/run.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 1 test passed, and statements, branches, functions, and lines are all 100%.
