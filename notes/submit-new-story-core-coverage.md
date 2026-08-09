# Submit new story core coverage

- Target: `src/core/cloud/submit-new-story/submit-new-story-core.js`
- Evidence: `npx jest test/core/cloud/submit-new-story/submit-new-story-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/submit-new-story/submit-new-story-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 28 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
