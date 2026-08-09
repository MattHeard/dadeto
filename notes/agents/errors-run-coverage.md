# Errors runner coverage

- Added valid and malformed string-body tests for the request wrapper.
- Added a defensive fallback test for a validated environment value disappearing before resolution.
- Verified with `npx jest test/core/cloud/errors/run.test.js --watchman=false --runInBand --coverage --collectCoverageFrom=src/core/cloud/errors/run.js --coverageReporters=text`.
- Focused report: `src/core/cloud/errors/run.js` reached 100% statements, branches, functions, and lines.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/errors/run.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/errors/run.js' --coverageReporters=text-summary` — 1 suite, 12 tests passed; statements 39/39, branches 27/27, functions 8/8, lines 39/39.
