# Assign moderation job core coverage

- Earlier hurdle: the remaining uncovered paths were defensive candidate-selection and tie-breaker fallbacks that normal integration fixtures do not reach.
- Earlier diagnosis: the focused Babel coverage report identified the exact helper branches and nullish fallback.
- Earlier fix: the internal selection helpers were covered through the existing test utility export, without changing production behavior or adding coverage exceptions.
- Unexpected hurdle in this pass: the existing tests covered only the main workflow and a small utility subset; the core still had substantial gaps in CORS composition, guard sequencing, legacy selection, and error normalization.
- Diagnosis: strict focused coverage began at 55.88% statements, 60% branches, 58.47% functions, and 55.88% lines.
- Fix: added direct tests for dependency initialization, request/token guards, CORS factories, query builders, snapshot fetchers, guard failures, both workflow selection paths, persistence, and response/error handling.
- Evidence: `npx jest test/core/cloud/assign-moderation-job-core.branch.test.js test/core/cloud/assign-moderation-job/index.test.js test/core/cloud/assign-moderation-job-core.coverage.additional.test.js --no-cache --watchman=false --runInBand --coverage --coverageProvider=babel --coverageReporters=text --collectCoverageFrom=src/core/cloud/assign-moderation-job/assign-moderation-job-core.js` reports 27 tests passed and 100% statements/branches/functions/lines.
- Next time: exercise public factories end-to-end first; they reach most private guard and normalization branches without test-only production exports.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/assign-moderation-job --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/assign-moderation-job/assign-moderation-job-core.js' --coverageReporters=text-summary` — 3 suites, 27 tests passed; statements 272/272, branches 105/105, functions 118/118, lines 272/272.
