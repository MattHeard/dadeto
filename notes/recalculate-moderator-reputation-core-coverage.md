# Recalculate moderator reputation core coverage

- Target: `src/core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.test.js test/core/cloud/recalculate-moderator-reputation/run.test.js test/cloud/recalculate-moderator-reputation.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 3 suites and 13 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
