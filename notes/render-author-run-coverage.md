# Render author run coverage

- Target: `src/core/cloud/render-author/run.js`
- Evidence: `npx jest test/core/cloud/render-author/run.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/render-author/run.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 1 test passed; statements, branches, functions, and lines each reached 100% without exclusions.
