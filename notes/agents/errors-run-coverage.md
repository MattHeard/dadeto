# Errors runner coverage

- Added valid and malformed string-body tests for the request wrapper.
- Added a defensive fallback test for a validated environment value disappearing before resolution.
- Verified with `npx jest test/core/cloud/errors/run.test.js --watchman=false --runInBand --coverage --collectCoverageFrom=src/core/cloud/errors/run.js --coverageReporters=text`.
- Focused report: `src/core/cloud/errors/run.js` reached 100% statements, branches, functions, and lines.
