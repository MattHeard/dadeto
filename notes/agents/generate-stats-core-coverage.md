# Generate stats core coverage

- Unexpected hurdle: the stale inventory omitted two CDN invalidation error branches and the non-empty nested-page traversal path.
- Diagnosis: focused ESM coverage identified metadata-token failure handling, mapped invalidation failure handling, and story/page counting as the missing paths.
- Fix: added genuine tests for those failures and the nested Firestore shape, including restoration of the injected UUID dependency after the failure case.
- Next time: exercise both empty and non-empty collection traversal paths when testing count fallbacks.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/generate-stats --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/generate-stats/generate-stats-core.js' --coverageReporters=text-summary` — 6 suites, 60 tests passed; statements 212/212, branches 80/80, functions 85/85, lines 209/209.
