# Browser graph plot core coverage

- Target: `src/core/browser/graphPlotCore.js`
- Evidence: `npx jest test/core/browser/graphPlotCore.test.js --runInBand --coverage --collectCoverageFrom=src/core/browser/graphPlotCore.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 10 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
