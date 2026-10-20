# Cloud wrapper tests without generated outputs

- Unexpected hurdle: `test/infra/cloudBrowserEntrypoints.test.js` still read three checked-in `infra/` wrapper copies, even though clean-checkout tests should not rely on `build:cloud` having populated deployment outputs.
- Diagnosis: `src/browser/admin-core.js`, `src/browser/load-static-config-core.js`, and `src/browser/logging.js` are the canonical wrapper sources; `createCopyCloudHandle` already exposes the source-to-target pairs through its injected copy adapter.
- Fix: assert wrapper contents from `src/browser/` and assert each copy mapping in `test/core/build/copy-cloud.test.js`.
- Evidence: both focused suites passed with all three `infra/` copies temporarily absent (2 suites, 13 tests); `npm run check` passed all five impact shards (955 suites, 6,523 tests) and all 10 static gates; `git diff --check` passed.
- Next time: when an infra test checks a generated wrapper, assert the canonical source and copy plan, and reserve built-output checks for the build workflow.
