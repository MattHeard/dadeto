# Cloud Firestore module coverage

- Target: `src/core/cloud/firestore.js`
- Evidence: `npx jest test/core/cloud/firestore.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/firestore.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 3 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
