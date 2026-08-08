# Create-checkout-session core coverage

- Added idempotency persistence assertions and the zero-credit dynamic package path.
- Verified with `npx jest test/core/cloud/create-checkout-session/create-checkout-session-core.test.js --no-cache --watchman=false --runInBand --coverage --coverageProvider=babel --collectCoverageFrom=src/core/cloud/create-checkout-session/create-checkout-session-core.js --coverageReporters=text`.
- Focused report: `src/core/cloud/create-checkout-session/create-checkout-session-core.js` reached 100% statements, branches, functions, and lines.
