## Submit moderation rating coverage

- Coverage was stuck at 99.28% because `extractErrorMessage` never saw a primitive rejection; every test path delivered an object so line 345 stayed dead.
- I added a suite that rejects `verifyIdToken` with a string so `createTokenError` falls back to the default message and the `extractErrorMessage` guard fires, plus extra responder scenarios (403/400/missing auth) to exercise the surrounding branches.
- Watch out for relative imports in `test/core/cloud/*`: I initially tried `../../src/...` and Jest could not resolve it, but other suites under that directory use `../../../src/...` to reach the root.

**Follow-up idea:** If this helper evolves, keep an eye on the token-error coverage gap by writing a helper that forces each branch (object with message/string, primitive, missing assignment) in isolation so future regressions are obvious.
