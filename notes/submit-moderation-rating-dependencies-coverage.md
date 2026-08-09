# Submit moderation rating dependencies coverage

- Source: `src/core/cloud/submit-moderation-rating/dependencies.js`
- Evidence: `npx jest test/core/cloud/submit-moderation-rating/dependencies.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/submit-moderation-rating/dependencies.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 3 tests passed, and statements, branches, functions, and lines are all 100%.
