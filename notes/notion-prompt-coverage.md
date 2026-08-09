# Notion Codex prompt coverage

- Source: `src/core/local/notion-codex/prompt.js`
- Added coverage for configured inbox page IDs and explicit token environment names.
- Evidence: `npx jest test/core/local/notion-codex/prompt.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/notion-codex/prompt.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 2 tests passed, and all four coverage metrics are 100%.
