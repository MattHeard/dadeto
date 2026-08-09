# Browser main coverage

- Target: `src/core/browser/main.js`
- Evidence: `npx jest test/core/browser/main.coverage.test.js --runInBand --coverage --collectCoverageFrom=src/core/browser/main.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 1 test passed; statements, branches, functions, and lines each reached 100% without exclusions.
