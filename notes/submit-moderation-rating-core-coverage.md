# Submit moderation rating core coverage

- Target: `src/core/cloud/submit-moderation-rating/submit-moderation-rating-core.js`
- Evidence: `npx jest test/core/cloud/submit-moderation-rating/submit-moderation-rating-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/submit-moderation-rating/submit-moderation-rating-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 24 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
