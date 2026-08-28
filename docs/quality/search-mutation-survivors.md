# Search mutation survivor note

The current resumable `npm run mutant:iterate` ledger covers all 378 current
`src/core` JavaScript targets. The run completed with 378/378 files processed,
0 pending, 0 failed, and 80 historical timeout records. One relocated search
module still has survivors and therefore keeps the mutation goal open.

## Current survivors

- `src/core/object-minute-rental-search/search-core.js`: 0 survivors in the
  latest run.
- `src/core/object-minute-rental-search/search-http.js`: 10 survivors.
  They are concentrated in request/body boundary handling, runner-id and
  supplier defaults, timestamp-format validation, commitment-list handling,
  and non-negative configuration validation (lines 44, 49, 70, 92, and 107).

The remaining HTTP survivors are not classified as static mutants. The next
remediation loop should
add behavior-distinguishing assertions for each listed predicate or remove a
guard only after proving its input is normalized at the public boundary. Do
not close the mutation objective while either file appears in
`core-files-with-surviving-mutants.json`.
