# Mark variant dirty core coverage

- Target: `src/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js`
- Evidence: `npx jest test/core/cloud/mark-variant-dirty/mark-variant-dirty-core.test.js test/core/cloud/mark-variant-dirty/run.test.js test/core/cloud/mark-variant-dirty/verifyAdmin.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 3 suites and 63 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
