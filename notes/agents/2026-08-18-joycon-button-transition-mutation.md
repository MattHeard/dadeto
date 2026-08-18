# JoyCon button-transition mutation slice

- Unexpected hurdle: the first full scan left two survivors at the exact previous-value threshold boundary.
- Diagnosis path: the bounded scan over `joyConMapper.js:973-1020` found eight behavioral survivors and adjacent `NoCoverage` mutants; direct predicate tests killed all but the strict threshold boundary.
- Chosen fix: added direct press-edge, threshold, transition, and candidate assertions, including current-above/previous-exact-threshold behavior.
- Evidence: the final bounded Stryker run over `985-987` killed all 10/10 threshold mutants; focused Jest passed 39 tests; targeted ESLint and diff checks passed.
- Next-time guidance: include exact equality cases whenever production logic uses strict threshold comparisons.
