# Mutation closure: build/copy

- Baseline: 55 killed, 3 surviving, and 1 timed-out mutant.
- Fix: added direct empty-directory and missing/empty declared-file tests, documented the recursive filesystem-entry boundary, and removed the equivalent empty-list early return.
- Evidence: focused Jest passed 17 tests; final Stryker scan reported 53 killed, 25 ignored, 0 surviving, and 0 timed-out mutants.
- Quality gate: `npm run check` ran; known sandbox `spawnSync node EPERM`, audit, lint, and duplication failures remain; file-specific ESLint passed.
