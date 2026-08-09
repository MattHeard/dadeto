# Report for moderation runtime coverage

- Source: `src/core/cloud/report-for-moderation/run.js`
- Evidence: `npx jest test/core/cloud/report-for-moderation/run.test.js test/core/cloud/report-for-moderation/run.coverage.additional.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/report-for-moderation/run.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites passed, 2 tests passed, and statements, branches, functions, and lines are all 100%.
