# Submit new story core coverage

- Target: `src/core/cloud/submit-new-story/submit-new-story-core.js`
- Evidence: `npx jest test/core/cloud/submit-new-story/submit-new-story-core.test.js test/core/cloud/submit-new-story/common-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/submit-new-story/submit-new-story-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites and 29 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
