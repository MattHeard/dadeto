# Symphony TUI renderer coverage

- Target: `src/core/local/symphony/tuiRenderer.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/local/symphony.tuiRenderer.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/symphony/tuiRenderer.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 7 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
