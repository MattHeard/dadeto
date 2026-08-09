# Tree visibility core coverage

- Target: `src/core/cloud/tree-visibility/tree-visibility-core.js`
- Evidence: `npx jest test/core/cloud/tree-visibility/tree-visibility-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/tree-visibility/tree-visibility-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 5 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
