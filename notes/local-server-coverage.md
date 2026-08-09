# Local server coverage

- Target: `src/core/local/server.js`
- Evidence: `npx jest test/core/local/server.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/server.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 12 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
