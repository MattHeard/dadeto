# Google auth cache coverage

- Source: `src/core/browser/google-auth-cache.js`
- Added a real test for the `sessionStorage` default used during wrapper installation.
- Evidence: `npx jest test/core/browser/google-auth-cache.test.js --runInBand --coverage --collectCoverageFrom=src/core/browser/google-auth-cache.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 7 tests passed, and statements, branches, functions, and lines are all 100%.
