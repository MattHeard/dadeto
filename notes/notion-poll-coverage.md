# Notion Codex poll coverage

- Source: `src/core/local/notion-codex/poll.js`
- Evidence: `npx jest test/local/notionCodex.poll.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/notion-codex/poll.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 18 tests passed, and statements, branches, functions, and lines are all 100%.
