# Admin stats command decomposition

- Unexpected hurdle: the first temporary diagnostic output included Prettier messages alongside the custom rule; filtering by rule ID confirmed the parameter-bag finding count had fallen from 16 to 14.
- Diagnosis path: focused tests exercised the existing `createTriggerStats` command boundary, and the helper contract kept permission as the first request argument. The full gate reported no type or behavior regressions.
- Chosen fix: leave `createTriggerStats` as a configuration composition boundary, bind status/error reporters in an action factory, and move endpoint lookup plus the POST into a four-input request helper that explicitly forwards `AllowEffects` to `fetchFn`.
- Evidence: focused Jest passed (4 suites, 132 tests); filtered per-file parameter-bag diagnostic reports 14 findings (down from 16); `npm run lint` and `npm run tsdoc:check` passed; elevated `DADETO_COVERAGE_SHARD_SIZE=40 JEST_CACHE_DIRECTORY=/home/matt/dadeto/.tmp/jest_rs TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, with 0 clones and 11/11 local E2E tests.
- Next: continue the remaining `admin-core.js` findings; global enforcement remains disabled pending full baseline resolution.
