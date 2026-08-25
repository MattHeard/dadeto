# Mutation closure: toys-core

- Unexpected hurdle: the initial parser loop caused 10 mutation timeouts when mutants prevented index progress.
- Diagnosis: an unbounded `while (hasMore())` loop can hang under valid mutation operators that alter index advancement.
- Fix: replaced it with a finite loop bounded by the input length, retaining the existing `hasMore()` guard and parser behavior; removed the resulting lint warning.
- Evidence: focused Jest passed 4 tests; final Stryker scan reported 93 killed, 2 ignored, 0 surviving, and 0 timed-out mutants.
- Quality gate: `npm run check` ran; known sandbox `spawnSync node EPERM`, audit, lint, and duplication failures remain; the file-specific ESLint check passes.
