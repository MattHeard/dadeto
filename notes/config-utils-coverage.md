# Local config utilities coverage

- Source: `src/core/local/config-utils.js`
- Added tests for optional string normalization and required named strings.
- Evidence: `npx jest test/local/notionCodex.config.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/config-utils.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 14 tests passed, and statements, branches, functions, and lines are all 100%.
