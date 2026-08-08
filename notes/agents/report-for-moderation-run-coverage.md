# Report-for-moderation runner coverage

- Added the successful persistence path to the runner test, including the server timestamp and collection write.
- Verified with `npx jest test/core/cloud/report-for-moderation/run.test.js --watchman=false --runInBand --coverage --collectCoverageFrom='src/core/cloud/report-for-moderation/run.js' --coverageReporters=text --coverageThreshold='{"global":{"branches":100,"functions":100,"lines":100,"statements":100}}'`.
- Focused report: `src/core/cloud/report-for-moderation/run.js` reached 100% statements, branches, functions, and lines.
