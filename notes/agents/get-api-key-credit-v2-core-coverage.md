# API key credit V2 core coverage

- Hurdle: existing tests covered Firestore helpers and some handler routes but left event validation and dependency fallback branches unexecuted.
- Diagnosis: the missing paths were deterministic request contracts and error handling, testable with injected async functions and fake Firestore.
- Fix: add cases for invalid event bodies, UUID extraction/defaults, missing dependencies, numeric/null balances, missing UUIDs, and the default logger.
- Guidance: cover both GET balance and POST ledger lifecycles, including every validation failure before testing persistence errors.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/get-api-key-credit-v2 --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js' --coverageReporters=text-summary` — 3 suites, 62 tests passed; statements 184/184, branches 98/98, functions 75/75, lines 179/179.
