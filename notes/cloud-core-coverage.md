# Cloud core coverage

- Source: `src/core/cloud/cloud-core.js`
- Evidence: `npx jest test/core/cloud/cloud-core.test.js test/core/cloud/cloud-core.branch.test.js test/core/cloud/cloud-core.coverage.additional.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/cloud-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 3 suites passed, 60 tests passed, and statements, branches, functions, and lines are all 100%.
