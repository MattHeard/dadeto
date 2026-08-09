# Notion outcome store coverage

- Source: `src/core/local/notion-codex/outcomeStore.js`
- Evidence: `npx jest test/core/local/notionCodex.outcomeStore.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/notion-codex/outcomeStore.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 5 tests passed, and statements, branches, functions, and lines are all 100%.
