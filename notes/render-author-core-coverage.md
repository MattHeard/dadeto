# Render-author core coverage

- Target: `src/core/cloud/render-author/render-author-core.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/render-author/render-author-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/render-author/render-author-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 13 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
