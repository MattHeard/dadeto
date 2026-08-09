# Report-for-moderation run coverage

- Target: `src/core/cloud/report-for-moderation/run.js`
- Evidence: `npx jest test/core/cloud/report-for-moderation/run.test.js test/core/cloud/report-for-moderation/handler.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/report-for-moderation/run.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites and 8 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
