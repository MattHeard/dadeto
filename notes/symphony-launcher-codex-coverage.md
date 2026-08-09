# Symphony launcher Codex coverage

- Target: `src/core/local/symphony/launcherCodex.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/local/symphony.launcherCodex.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/symphony/launcherCodex.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 4 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
