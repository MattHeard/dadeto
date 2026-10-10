# Playwright runner parameter arity

- **Unexpected hurdle:** The fresh repository-wide ESLint diagnostic stalled during TypeScript program analysis and produced an empty JSON artifact; it was stopped before producing evidence.
- **Diagnosis:** The bounded source file and its focused suites complete normally, so the expensive diagnostic is isolated to running the rule against the whole core tree in one ESLint process.
- **Chosen fix:** Keep this loop scoped to the two spawn helpers. Their cohesive inputs now have named JSDoc contracts and are read as records, preserving process arguments, environment, working directory, and API URL fallback.
- **Evidence:** Three focused Jest suites passed (17 tests); per-file no-cache arity scan reported 0 findings; scoped lint/TSDoc/diff check passed; `npm run check` passed all 10 gates with 0 failures and 0 clones (`.tmp/npm-check-parameter-bag-playwright-runner.log`).
- **Next-time guidance:** Use ESLint API batching or smaller directory shards for the global count instead of one full-tree invocation. The last successful global scan was 88 findings, with the next file `src/core/local/gcp-simulator/playwright-runner.js`; refresh the global inventory using a bounded scanner before choosing a new target.
