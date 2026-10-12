# Mark variant dirty Firestore write effects

- Unexpected hurdle: `npm run check` first found that the new cloud adapter exceeded the 50-line non-core limit and the variant/author update paths duplicated a short block.
- Diagnosis: the adapter's prose comments pushed it to 53 lines; the author and variant paths both contained the same conditional dirty update.
- Fix: shortened redundant comment prose and reused the permission-aware conditional update helper for the author write. The aggregate check then passed with zero duplication clones.
- Evidence: focused mark-variant-dirty suites passed (3 suites / 64 tests); `npm run tsdoc:check` passed; full `npm run check` passed all 10 gates, including local E2E; `npm run build:cloud` passed.
- Next: permission-gate mark-variant-dirty response methods and logging, with fresh invocation tokens, then continue the source-cloud AllowEffects audit.
