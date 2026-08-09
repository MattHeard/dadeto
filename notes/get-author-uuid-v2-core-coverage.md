# Get-author UUID v2 core coverage

- Target: `src/core/cloud/get-author-uuid-v2/get-author-uuid-v2-core.js`
- Evidence: `npx jest test/core/cloud/get-author-uuid-v2/get-author-uuid-v2-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/get-author-uuid-v2/get-author-uuid-v2-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 5 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
