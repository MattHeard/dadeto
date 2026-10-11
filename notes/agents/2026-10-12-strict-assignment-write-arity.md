# Strict assignment write arity cleanup

- Unexpected hurdle: strict assignment results bundled a persistence descriptor, toy response metadata, and feasibility, and the writer unpacked all five fields before also using the storage environment.
- Diagnosis: `appendValidatedAssignment` was coordinating three distinct decisions: whether to write, what to persist, and how to format success.
- Fix: the writer now receives four semantic inputs: a cohesive assignment write descriptor, response metadata, feasibility, and the storage environment. Callers pass the write descriptor separately from metadata and feasibility.
- Evidence: four focused suites passed (44 tests); ESLint and TSDoc passed; target lint scan has 0 findings; global scan fell from 18 findings/18 files to 17/17 (`.tmp/parameter-bag-global-after-strict-assignment-core.json`); `npm run check` passed all 10 gates, including 11 local E2E tests and 0 clones; `npm run build` and `git diff --check` passed.
- Next time: start from the fresh global rule report. Next finding is `src/core/browser/webmcp.js:98` (effective arity 8). Inspect the WebMCP dispatch selection before refactoring.
