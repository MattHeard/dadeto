# Mark variant dirty authorization logging

- Unexpected hurdle: the shared admin guard logs malformed, missing, and rejected tokens through global console when no logger is injected.
- Diagnosis: response writes were already behind permission-first adapters, but `runMarkVariantDirty` relied on `createVerifyAdmin`'s default logger.
- Fix: added a cloud warning adapter and passed the guard a logger whose `warn` operation mints a fresh invocation capability for every diagnostic. Added coverage for malformed headers, missing tokens, rejected tokens, and distinct frozen logging permissions.
- Evidence: focused suites passed (6 suites / 74 tests); `npm run lint` and `npm run tsdoc:check` passed; full `npm run check` passed all 10 gates including local E2E and full coverage; `npm run build:cloud` passed.
- Next: continue the lexicographic source-cloud AllowEffects audit; mark-variant-dirty has no remaining direct response writes or default auth logger use in its composition.
