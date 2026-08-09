# HTTP endpoint bootstrap coverage

- Source: `src/core/cloud/http-endpoint-bootstrap.js`
- Evidence: `npx jest test/core/cloud/http-endpoint-bootstrap.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/http-endpoint-bootstrap.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 2 tests passed, and statements, branches, functions, and lines are all 100%.
