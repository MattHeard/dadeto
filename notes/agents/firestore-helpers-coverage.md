# Firestore helpers coverage

- Added tests for named databases with an app and default-database app-only calls.
- Verified with `npx jest test/cloud/firestore.test.js --no-cache --watchman=false --runInBand --coverage --coverageProvider=babel --collectCoverageFrom=src/core/cloud/firestore-helpers.js --coverageReporters=text`.
- Focused report: `src/core/cloud/firestore-helpers.js` reached 100% statements, branches, functions, and lines.
