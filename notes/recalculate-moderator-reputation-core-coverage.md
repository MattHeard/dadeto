# Recalculate moderator reputation core coverage

- Target: `src/core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js`
- Evidence: `npx jest test/core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 11 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
