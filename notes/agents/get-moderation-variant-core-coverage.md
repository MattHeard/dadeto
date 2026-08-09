# Get-moderation-variant core coverage

- Added direct reference-chain, missing-header, origin, missing-story, and empty-data coverage.
- Exposed two existing internal helpers through the test utility object to verify their defensive paths without exclusions.
- Verified with `npx jest test/core/cloud/get-moderation-variant/get-moderation-variant-core.test.js --no-cache --watchman=false --runInBand --coverage --coverageProvider=babel --collectCoverageFrom=src/core/cloud/get-moderation-variant/get-moderation-variant-core.js --coverageReporters=text`.
- Focused report: `src/core/cloud/get-moderation-variant/get-moderation-variant-core.js` reached 100% statements, branches, functions, and lines.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/get-moderation-variant --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/get-moderation-variant/get-moderation-variant-core.js' --coverageReporters=text-summary` — 3 suites, 49 tests passed; statements 154/154, branches 75/75, functions 64/64, lines 150/150.
