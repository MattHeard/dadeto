# Generate stats core coverage

- Target: `src/core/cloud/generate-stats/generate-stats-core.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/generate-stats/generate-stats-core.test.js test/core/cloud/generate-stats/verifyAdmin.test.js test/core/cloud/generate-stats/run.test.js test/cloud-functions/generateStats.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/generate-stats/generate-stats-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 4 suites and 55 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
