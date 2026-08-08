# Moderator reputation core coverage

- Added coverage for existing author documents being marked dirty and for references without an optional `get` method.
- Verified with `npx jest test/core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.test.js --no-cache --watchman=false --runInBand --coverage --coverageProvider=babel --collectCoverageFrom=src/core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js --coverageReporters=text`.
- Focused report: `src/core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js` reached 100% statements, branches, functions, and lines.
