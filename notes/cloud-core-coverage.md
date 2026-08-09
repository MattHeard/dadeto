# Cloud core facade coverage

- Target: `src/core/cloud/cloud-core.js`
- Evidence: `npx jest test/core/cloud/cloud-core.test.js test/core/cloud/cloud-core.branch.test.js test/core/cloud/cloud-core.coverage.additional.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/cloud-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 3 suites and 60 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
