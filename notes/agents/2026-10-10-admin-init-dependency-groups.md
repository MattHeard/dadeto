# Admin initialization dependency grouping

- Unexpected hurdle: the first full check could not spawn child Node processes in the restricted runner, so its test and core-parse gates failed with `EPERM`; the audit gate also lacked registry access.
- Diagnosis: focused tests, lint, and the rule-specific scan all ran in the default workspace. Retrying the same full check with the previously authorized elevated runner completed all 10 gates successfully, including npm audit.
- Chosen fix: split `validateInitAdminDeps` inputs into authentication, UI listener, and command-effect groups. This removes one parameter-bag finding while keeping validation order and the fresh `bindEffectBoundary` dependency explicit.
- Evidence: admin-core focused Jest suites passed (3 suites, 104 tests); temporary parameter-bag rule scan dropped from 19 to 18 findings; `npm run lint` passed; elevated `DADETO_COVERAGE_SHARD_SIZE=40 JEST_CACHE_DIRECTORY=/home/matt/dadeto/.tmp/jest_rs TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, with 0 clones and 11/11 local E2E tests.
- Next: continue decomposing the remaining 18 findings in `src/core/browser/admin-core.js`; keep global rule enforcement disabled until the full existing baseline is resolved.
