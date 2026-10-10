# Admin credential sign-in decomposition

- Unexpected hurdle: the first full check caught a missing JSDoc type on the extracted credential callback; a shell-quoted Beads note attempt also executed backtick substitutions, so I verified the bead history and re-recorded the result safely.
- Diagnosis path: focused sign-in tests preserved the old credential, auth-state recovery, storage, and notification behavior. The full check isolated the type error to `rawCredential`; `npm run tsdoc:check` passed after the explicit string annotation.
- Chosen fix: keep the existing `handleCredentialSignIn` context API, build the Firebase credential-sign-in operation and token-persistence capability separately, and let a four-input helper coordinate the Firebase call and partial-failure recovery.
- Evidence: focused Jest passed (4 suites, 109 tests); per-file parameter-bag diagnostic is 16 findings (down from 17); `npm run lint` passed; elevated `DADETO_COVERAGE_SHARD_SIZE=40 JEST_CACHE_DIRECTORY=/home/matt/dadeto/.tmp/jest_rs TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, 0 clones, and 11/11 local E2E.
- Next: continue the 16 remaining findings in `src/core/browser/admin-core.js`; global rule enforcement remains staged until the full baseline is resolved.
