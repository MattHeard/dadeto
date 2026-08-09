# Create-checkout-session runtime core coverage

- Target: `src/core/cloud/create-checkout-session/runtime-core.js`
- Evidence: `npx jest test/core/cloud/create-checkout-session/runtime-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/create-checkout-session/runtime-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 3 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
