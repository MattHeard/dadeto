# JoyCon pending-control mutation slice

- Unexpected hurdle: the initial pending-control scan left survivors in the short-circuit path and `findIndex` callback.
- Diagnosis path: a bounded scan over `joyConMapper.js:902-917` reported three survivors and one `NoCoverage` mutant.
- Chosen fix: added direct assertions for mapped, skipped, pending, and sequentially skipped controls, covering both predicate operands and the first-pending index callback.
- Evidence: the final bounded Stryker run killed all 8/8 mutants; focused Jest passed 36 tests; targeted ESLint and diff checks passed.
- Next-time guidance: test each short-circuit operand with an input that reaches it, not only the aggregate helper result.
