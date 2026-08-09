# Moderation authenticated fetch coverage

- Source: `src/core/browser/moderation/authedFetch.js`
- Evidence: `npx jest test/core/browser/moderation/authedFetch.test.js --runInBand --coverage --collectCoverageFrom=src/core/browser/moderation/authedFetch.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 11 tests passed, and statements, branches, functions, and lines are all 100%.
