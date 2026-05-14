# 2026-05-14 Coverage Threshold Check

## Context
- Bead: `dadeto-n1y5`
- Goal: enforce 100% Jest coverage thresholds for lines, branches, and functions, then restore missing coverage.

## Unexpected Hurdle
Adding global `coverageThreshold` immediately makes targeted `--runTestsByPath` coverage runs fail against the whole repository totals. The targeted run still helped identify remaining local gaps in the edited files, but it could not be used as the final signal once the global threshold was present.

## Diagnosis Path
- Added the threshold in `jest.config.mjs`.
- Used a targeted coverage run to inspect gaps around `realHourlyWage`, `cozyHouseAdventure`, `realtimeVoicePrototype`, and `cloud-core`.
- Switched back to full-suite validation for the authoritative coverage result.

## Fix
- Removed one unreachable fallback branch in `realHourlyWage`.
- Added tests for the uncovered state, fallback, numeric, and parsing branches in the affected core/toy modules.
- Left global thresholds at 100% for branches, functions, and lines.

## Evidence
- `npm test` passed with all files at 100% statements, branches, functions, and lines.
- `npm run check` passed, including Jest coverage, lint, dependency-cruiser, duplication, non-core thin-file check, and `npm audit` with 0 vulnerabilities.

## Next-Time Guidance
After changing global coverage thresholds, use targeted runs only for investigation. Treat a full `npm test` or `npm run check` as the real pass/fail signal because Jest applies the global coverage threshold to repository totals.
