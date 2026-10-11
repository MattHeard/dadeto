# Google auth cache installer arity cleanup

- Unexpected hurdle: a combined focused command referenced a nonexistent browser-auth test path; invoking Jest directly also bypassed the repository's ESM runner setup.
- Diagnosis: the actual focused suite is `test/core/browser/google-auth-cache.test.js`, and the repo wrapper is needed for consistent ESM execution.
- Fix: `installAuthorUuidCaching` now receives the auth handle, storage, remote author API, and origin/effect environment as four cohesive inputs. `googleAuth.js` composes those records explicitly; AllowEffects still guards every fetch and storage write.
- Evidence: fresh scoped no-cache arity report `.tmp/google-auth-cache-arity-after.json` has zero findings; repository-runner cache tests passed (1 suite, 10 tests); TSDoc passed; elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates with 0 failures, 0 clones, and 0 audit vulnerabilities. Fresh global inventory `.tmp/parameter-bag-global-after-google-auth-cache.json` reports 36 findings across 36 files, down from 37/37.
- Next time: confirm focused test paths with `rg --files test` and use `scripts/run-jest.js`. Next target is `src/core/browser/google-auth-status.js:14`.
