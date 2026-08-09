# Mark-variant-dirty runtime coverage

- Target: `src/core/cloud/mark-variant-dirty/run.js`
- Evidence: `npx jest test/core/cloud/mark-variant-dirty/run.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/mark-variant-dirty/run.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 2 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
