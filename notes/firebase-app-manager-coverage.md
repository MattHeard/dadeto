# Firebase app manager coverage

- Source: `src/core/cloud/firebase-app-manager.js`
- Evidence: `npx jest test/core/cloud/firebase-app-manager.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/firebase-app-manager.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 4 tests passed, and statements, branches, functions, and lines are all 100%.
