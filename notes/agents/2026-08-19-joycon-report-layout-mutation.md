# JoyCon report-layout mutation slice

- Unexpected hurdle: fallback assertions alone left standard-layout mutants alive because the positive branch was only checked by output length.
- Diagnosis: the predicate combines nullish report-ID selection, the `0x3f` header, and a minimum length; each needed an observable bit-level assertion.
- Fix: added short-header, explicit-ID override, inferred-header, and exact standard-layout bit assertions.
- Evidence: `npx jest --config jest.config.mjs --runInBand test/core/browser/inputHandlers/joyConMapper.helpers.test.js` passed 88 tests; targeted ESLint and `git diff --check` passed; Stryker scanned 10 mutants with 10 killed, 0 survived, and 0 timeouts.
- Next time: for report predicates, test both explicit and inferred IDs plus the exact length boundary, then assert decoded content rather than only collection sizes.
