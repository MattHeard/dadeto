# CORS config coverage

- Source: `src/core/cloud/cors-config.js`
- Evidence: `npx jest test/core/cloud/cors-config.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/cors-config.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 5 tests passed, and statements, branches, functions, and lines are all 100%.
