# JoyCon payload mutation slice

- Unexpected hurdle: the initial scan left one survivor in the empty current-control-key branch and reported adjacent payload no-coverage mutants.
- Diagnosis path: a bounded scan over `joyConMapper.js:1266-1300` isolated `attachCurrentControlKey` and `buildPayload` behavior.
- Chosen fix: exported `buildPayload` for focused tests and asserted empty-key omission plus extra-field preservation.
- Evidence: the final bounded Stryker run killed all 11/11 mutants; focused Jest passed 44 tests; targeted ESLint and diff checks passed.
- Next-time guidance: test both omission and augmentation behavior for payload decorators.
