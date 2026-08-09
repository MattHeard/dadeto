# Build copy-cloud coverage

- Target: `src/core/build/copy-cloud.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/build/copy-cloud.test.js --runInBand --coverage --collectCoverageFrom=src/core/build/copy-cloud.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 1 test passed; statements, branches, functions, and lines each reached 100% without exclusions.
