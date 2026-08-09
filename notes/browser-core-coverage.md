# Browser core coverage

- Source: `src/core/browser/browser-core.js`
- Evidence: `npx jest test/core/browser/browser-core.test.js test/core/browser/browser-core.coverage.additional.test.js test/browser/browser-core.safeJsonParse.test.js --runInBand --coverage --collectCoverageFrom=src/core/browser/browser-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 3 suites passed, 19 tests passed, and statements, branches, functions, and lines are all 100%.
