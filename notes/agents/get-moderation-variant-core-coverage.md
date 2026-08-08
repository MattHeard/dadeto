# Get-moderation-variant core coverage

- Added direct reference-chain, missing-header, origin, missing-story, and empty-data coverage.
- Exposed two existing internal helpers through the test utility object to verify their defensive paths without exclusions.
- Verified with `npx jest test/core/cloud/get-moderation-variant/get-moderation-variant-core.test.js --no-cache --watchman=false --runInBand --coverage --coverageProvider=babel --collectCoverageFrom=src/core/cloud/get-moderation-variant/get-moderation-variant-core.js --coverageReporters=text`.
- Focused report: `src/core/cloud/get-moderation-variant/get-moderation-variant-core.js` reached 100% statements, branches, functions, and lines.
