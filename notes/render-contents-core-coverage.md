# Render-contents core coverage

- Target: `src/core/cloud/render-contents/render-contents-core.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/render-contents/render-contents-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/render-contents/render-contents-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 61 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
