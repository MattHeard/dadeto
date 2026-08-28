# Search mutation survivor note

The current resumable `npm run mutant:iterate` ledger covers all 378 current
`src/core` JavaScript targets. The run completed with 378/378 files processed,
0 pending, 0 failed, and 80 historical timeout records. Two relocated search
modules still have non-static survivors and therefore keep the mutation goal
open.

## Current survivors

- `src/core/object-minute-rental-search/search-core.js`: 21 survivors.
  They are concentrated in the inclusive containment and overlap predicates,
  delivery fallback selection, candidate-feasibility guards, and clock-in /
  clock-out fallback selection (lines 15, 16, 17, 62, 64, 89, 91, 193-195,
  203, and 211).
- `src/core/object-minute-rental-search/search-http.js`: 15 survivors.
  They are concentrated in request/body boundary handling, runner-id and
  supplier defaults, timestamp-format validation, commitment-list handling,
  and non-negative configuration validation (lines 22, 25, 44, 49, 70, 92,
  105, 107-108, and 134).

These are not classified as static mutants. The next remediation loop should
add behavior-distinguishing assertions for each listed predicate or remove a
guard only after proving its input is normalized at the public boundary. Do
not close the mutation objective while either file appears in
`core-files-with-surviving-mutants.json`.
