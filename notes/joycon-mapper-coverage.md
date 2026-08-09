# Joy-Con mapper coverage

- Target: `src/core/browser/inputHandlers/joyConMapper.js`
- Evidence: `npx jest test/core/browser/inputHandlers/joyConMapper.coverage.test.js test/core/browser/inputHandlers/joyConMapper.helpers.test.js test/browser/inputHandlers/joyConMapperHandler.test.js --runInBand --coverage --collectCoverageFrom=src/core/browser/inputHandlers/joyConMapper.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 3 suites and 37 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
