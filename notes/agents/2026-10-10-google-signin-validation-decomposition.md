# Google sign-in dependency validation decomposition

- Unexpected hurdle: grouping six Google Auth dependencies into two bags did not reduce the effective-arity finding; the rule correctly counted all six destructured values.
- Diagnosis path: reran the focused ESLint API diagnostic and confirmed the two constructor findings remained. Read the existing validator call path and validation tests to identify a true responsibility split.
- Chosen fix: retain the complete Google sign-in dependency object at the orchestration boundary, then validate Firebase credential/storage concerns in a four-input helper and browser UI concerns in a two-input helper. Validation order and error messages remain unchanged.
- Evidence: focused admin Jest suites passed (3 suites, 104 tests); the per-file diagnostic reports 17 findings in `src/core/browser/admin-core.js` (down from 18 before this loop); `npm run lint` passed; elevated `DADETO_COVERAGE_SHARD_SIZE=40 JEST_CACHE_DIRECTORY=/home/matt/dadeto/.tmp/jest_rs TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, with 0 clones and 11/11 local E2E tests.
- Next: continue the 17 remaining findings in `admin-core.js`, prioritizing the Google sign-in construction flow where several findings cluster.
