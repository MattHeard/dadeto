# Get moderation variant core coverage

- Target: `src/core/cloud/get-moderation-variant/get-moderation-variant-core.js`
- Evidence: `npx jest test/core/cloud/get-moderation-variant/get-moderation-variant-core.test.js test/core/cloud/get-moderation-variant-core.branch.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/get-moderation-variant/get-moderation-variant-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites and 45 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
