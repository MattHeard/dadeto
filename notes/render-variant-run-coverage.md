# Render variant run coverage

- Target: `src/core/cloud/render-variant/run.js`
- Evidence: `npx jest test/core/cloud/render-variant/run.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/render-variant/run.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 5 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
