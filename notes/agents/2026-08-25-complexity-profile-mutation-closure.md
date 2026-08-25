# Mutation closure: complexity-profile

- Baseline: 137 killed, 12 surviving, 3 timed-out, and 1 runtime-error mutant.
- Fix: added line-range boundary, sorting, and minimum-threshold assertions; replaced mutation-prone CLI index increments with finite iteration and skip state; documented equivalent normalization/sort boundaries.
- Evidence: focused Jest passed 12 tests; final Stryker scan reported 146 killed, 8 ignored, 0 non-static surviving, 0 timed-out, and 1 static runtime-error mutant caused by removing the exported handle factory body.
- Quality gate: `npm run check` ran; known sandbox `spawnSync node EPERM`, audit, lint, and duplication failures remain; file-specific ESLint passed.
