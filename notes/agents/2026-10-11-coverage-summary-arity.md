# Coverage summary capability arity

- Unexpected hurdle: the sandboxed full check could not spawn the core-parse classifier or reach the npm audit registry; the reviewed elevated retry passed.
- Diagnosis: the coverage summary constructor mixed file paths and low-level file adapters with the summary pipeline.
- Fix: introduced a parsed coverage reader and a summary writer that captures the output path and `AllowEffects` boundary. The core handler now composes the reader, coverage-map factory, and writer as named capabilities.
- Preserved behavior: default and custom paths; the clear missing-file diagnostic; unchanged propagation of other read/parse failures; summary JSON formatting; and a fresh permission boundary for the output write.
- Evidence: focused Jest passed (1 suite, 8 tests); target lint and TSDoc passed; fresh no-cache parameter-bag scan fell from 1 finding in 1 file to 0 findings; artifact `.tmp/parameter-bag-global-after-coverage-summary.json`. Elevated `npm run check` passed all 10 gates, including 11 E2E tests, 0 clones, and 0 audit vulnerabilities; log `.tmp/npm-check-coverage-summary-arity-elevated.log`. `npm run build` passed; log `.tmp/build-coverage-summary-arity.log`. `git diff --check` passed.
- Next time: classify the remaining `assign-moderation-job` imports `resolveFirestoreEnvironment` and `shouldUseCustomFirestoreDependencies` against their actual implementations and existing tests, then continue auditing command effects in lexicographic `src/cloud` order.
