# Cloud HTML template coverage

- Target: `src/core/cloud/html-template.js`
- Evidence: `npx jest test/core/cloud/html-template.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/html-template.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 1 test passed; statements, branches, functions, and lines each reached 100% without exclusions.
