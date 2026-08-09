# Moderation CORS coverage

- Source: `src/core/cloud/get-moderation-variant/cors.js`
- Evidence: `npx jest test/core/cloud/get-moderation-variant/cors.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/get-moderation-variant/cors.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 4 tests passed, and statements, branches, functions, and lines are all 100%.
