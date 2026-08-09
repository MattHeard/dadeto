# Allowed origins coverage

- Source: `src/core/cloud/allowed-origins.js`
- Evidence: `npx jest test/core/cloud/allowed-origins.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/allowed-origins.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 1 test passed, and statements, branches, functions, and lines are all 100%.
