# Generate-stats admin config coverage

- Target: `src/core/cloud/generate-stats/admin-config.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/generate-stats/admin-config.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/generate-stats/admin-config.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 1 test passed; statements, branches, functions, and lines each reached 100% without exclusions.
