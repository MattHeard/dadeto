# Cloud wrapper output fixture

- Unexpected hurdle: the copy-cloud unit test captured source and target arguments but did not execute filesystem copies or inspect deployment output bytes.
- Diagnosis: `createCopyCloudHandle` derives its project root from injected path helpers, so a temporary module path can redirect the real workflow to an isolated tree.
- Fix: run the handler with temporary wrapper sources, real filesystem copies for the three root wrappers, and no-op adapters for unrelated copy operations; assert exact output bytes and reject a missing wrapper source.
- Evidence: focused `test/core/build/copy-cloud.test.js` passed (1 suite, 3 tests); `npm run check` passed all five impact shards (955 suites, 6,523 tests) and all 10 static gates; `git diff --check` passed. The local check does not measure global coverage.
- Next time: keep deployment artifact tests in temporary roots and restrict real copying to the artifact paths under test.
