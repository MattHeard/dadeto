# JoyCon ensure-started mutation slice

- Unexpected hurdle: ordinary mutable states could not distinguish the early-return mutant from the assignment path when both ended with `started: true`.
- Diagnosis path: the first verification run killed 3/5 mutants and left the false-condition and empty-block survivors.
- Chosen fix: added a frozen already-started state assertion, proving the guard avoids a redundant assignment.
- Evidence: the final verification scan killed all 5 mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: use immutable-state assertions to distinguish idempotent early-return behavior from redundant writes.
