# Notion Codex launcher coverage

- Source: `src/core/local/notion-codex/launcher.js`
- Evidence: `npx jest test/local/notionCodex.launcher.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/notion-codex/launcher.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 7 tests passed, and statements, branches, functions, and lines are all 100%.
