# Notion state store coverage

- Source: `src/core/local/notion-codex/stateStore.js`
- Evidence: `npx jest test/core/local/notion-codex/stateStore.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/notion-codex/stateStore.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 11 tests passed, and statements, branches, functions, and lines are all 100%.
