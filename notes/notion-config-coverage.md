# Notion Codex config coverage

- Source: `src/core/local/notion-codex/config.js`
- Evidence: `npx jest test/local/notionCodex.config.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/notion-codex/config.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 13 tests passed, and statements, branches, functions, and lines are all 100%.
