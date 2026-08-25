# Mutation closure: toyPersistence

- Baseline: 64 killed, 15 surviving, and 2 no-coverage mutants.
- Fix: added explicit tests for malformed storage, non-string and blank input, JSON primitives/arrays, and object-record parsing; documented malformed environment/input guards as defensive boundaries.
- Evidence: focused Jest passed 7 tests; final Stryker scan reported 60 killed, 19 ignored, 2 no-coverage, 0 surviving, and 0 timed-out mutants.
- Quality gate: `npm run check` ran; the known sandbox `spawnSync node EPERM`, repository audit, lint, and duplication failures remain; manuals, depcruise, entrypoint-pattern, non-core-thin, overexposed-exports, and tsdoc checks passed.
