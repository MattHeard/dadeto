# Symphony Codex launcher coverage

- Source: `src/core/local/symphony/launcherCodex.js`
- Evidence: `npx jest test/local/symphony.launcherCodex.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/symphony/launcherCodex.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 4 tests passed, and statements, branches, functions, and lines are all 100%.
