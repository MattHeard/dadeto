# Render variant core coverage

- Target: `src/core/cloud/render-variant/render-variant-core.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/render-variant-core.branch.test.js test/core/cloud/render-variant/render-variant-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/render-variant/render-variant-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites and 102 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
