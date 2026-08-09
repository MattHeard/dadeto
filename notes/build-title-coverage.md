# Build title coverage

- Target: `src/core/build/title.js`
- Evidence: `npx jest test/core/build/title.test.js --runInBand --coverage --collectCoverageFrom=src/core/build/title.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 1 test passed; statements, branches, functions, and lines each reached 100% without exclusions.
