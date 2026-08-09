# Assign moderation job core coverage

- Target: `src/core/cloud/assign-moderation-job/assign-moderation-job-core.js`
- Evidence: `npx jest test/cloud/assign-moderation-job/core.test.js test/cloud/assign-moderation-job/create-cors-options.test.js test/core/cloud/assign-moderation-job-core.coverage.additional.test.js test/core/cloud/assign-moderation-job-core.branch.test.js test/cloud-functions/assignModerationWorkflow.test.js test/cloud-functions/variantSelection.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/assign-moderation-job/assign-moderation-job-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 6 suites and 93 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
