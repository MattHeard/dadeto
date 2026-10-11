# Firebase app context arity cleanup

- Unexpected hurdle: the first restricted `npm run check` attempt could not spawn the Node subprocess used by the core parse gate and could not complete npm audit.
- Diagnosis: the failures were environmental (`EPERM` for the configured Node executable and restricted npm network access), not source regressions. The elevated rerun completed both gates successfully.
- Fix: `createFirebaseAppContext` now reads service functions from its named dependency record and keeps the options record explicit. Function references are assigned without binding so invocation semantics remain the same; `includeApp` still defaults to true.
- Evidence: focused Firebase app manager tests passed (4 tests), targeted no-cache arity scan passed with zero findings, TSDoc passed, and elevated `npm run check` passed all 10 gates. Coverage: lines 23545/23545, statements 24694/24694, functions 7927/7927, branches 13271/13271 (100%). Local E2E passed 11/11, duplication found 0 clones, npm audit found 0 vulnerabilities. Cloud-only inventory fell to 14 findings across 14 files in `/tmp/parameter-bag-cloud-after-firebase-app-manager.json`.
- Next time: use elevated execution for the repository-wide check when sandbox process spawning or npm network access fails; inspect the next cloud candidate from the fresh inventory (`firestore-handle.js`, one finding).
