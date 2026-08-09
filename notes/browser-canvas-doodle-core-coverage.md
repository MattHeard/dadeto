# Browser canvas doodle core coverage

- Target: `src/core/browser/canvasDoodleCore.js`
- Evidence: `npx jest test/core/browser/canvasDoodleCore.test.js --runInBand --coverage --collectCoverageFrom=src/core/browser/canvasDoodleCore.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 5 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
