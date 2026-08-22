# Toys foundation mutation slice

- Unexpected hurdle: a broad `toys.js` scan over 106 tests was estimated at hours and produced 234 survivors because unrelated UI paths dominated the run.
- Diagnosis path: stopped the oversized run and narrowed to lines 70-186 with the direct conversion, disposal, and core coverage suites.
- Chosen fix: added stored-row normalization and precedence assertions, removed redundant blank/defaulting logic and an unreachable undefined branch, and verified disposal no-op behavior.
- Evidence: bounded scan instrumented 43 mutants; 43 killed, 0 survivors, 0 timeouts; focused Jest passed 22 tests.
- Next-time guidance: continue `toys.js` in bounded line slices; do not use the broad 106-test scan as the per-slice evaluator.
