# report-for-moderation run coverage

- Unexpected hurdle: the wiring entrypoint requires a supported `DENDRITE_ENVIRONMENT` value; an arbitrary test value is rejected by the real CORS configuration.
- Diagnosis: the entrypoint had no direct coverage despite its domain handler tests; strict coverage showed the wiring and adapter closure paths were untouched.
- Fix: added an integration test using the supported `t-test` environment, exercising Firebase setup, Firestore collection wiring, CORS/Express setup, function registration, and a valid report request.
- Evidence: focused Jest passed at 100% statements, branches, functions, and lines.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/report-for-moderation --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/report-for-moderation/run.js' --coverageReporters=text-summary` — 4 suites, 32 tests passed; statements 20/20, branches 0/0, functions 4/4, lines 19/19.
