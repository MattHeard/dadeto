# Google auth status factory arity cleanup

- Unexpected hurdle: widening the auth-status call to three explicit records pushed `contentsGoogleAuthModule.js` over the non-core 50-line limit. The first full check caught it precisely.
- Diagnosis: that browser entrypoint imported four names from one auth module across a multiline import. A namespace import preserves the module boundary while bringing the entrypoint back under its line budget.
- Fix: `createGoogleAuthStatusHandle` now receives the document, auth actions, and identity accessors separately; all three browser entrypoints and the focused tests use those grouped inputs.
- Evidence: scoped no-cache arity report `.tmp/google-auth-status-arity-after.json` is empty; focused auth-status tests passed (1 suite, 2 tests); TSDoc and focused lint passed; `npm run non-core-thin` passed for 274 files; elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates with 0 failures, 0 clones, and 0 audit vulnerabilities. Fresh global report `.tmp/parameter-bag-global-after-google-auth-status.json` reports 35 findings across 35 files, down from 36/36.
- Next time: after updating a thin browser entrypoint, run `npm run non-core-thin` before the full gate. Next target is `src/core/browser/inputHandlers/blogKeyHandler.js:78`.
