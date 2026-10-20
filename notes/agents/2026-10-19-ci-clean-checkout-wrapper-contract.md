# CI clean-checkout wrapper contract

- Unexpected hurdle: manually removing tracked generated wrappers proved the source-contract suite was independent of them, but ordinary CI checkouts include those wrapper copies and could mask a future accidental read.
- Diagnosis: the Jest suite reads project files relative to its working directory, so running a copied test in a minimal temporary project gives it a real clean-checkout filesystem boundary.
- Fix: add a copy-cloud test that creates that minimal project, omits all three generated wrappers, runs the source-contract suite successfully, then injects a direct wrapper read and requires the child suite to fail.
- Evidence: focused `test/core/build/copy-cloud.test.js` passed (1 suite, 4 tests); targeted ESLint passed; `npm run check` passed all five impact shards and all 10 static gates; `git diff --check` passed. The local check does not measure global coverage.
- Next time: keep the temporary project limited to the exact source-contract inputs so generated package files stay absent by construction.
