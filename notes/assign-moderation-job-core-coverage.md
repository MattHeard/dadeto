# Assign-moderation-job core coverage

- Target: `src/core/cloud/assign-moderation-job/assign-moderation-job-core.js`
- Evidence: `npx jest test/core/cloud/assign-moderation-job-core.branch.test.js test/core/cloud/assign-moderation-job-core.coverage.additional.test.js test/core/cloud/assign-moderation-job/index.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/assign-moderation-job/assign-moderation-job-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 3 suites and 27 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
