# THREEFOLD campaign clock

## Unexpected hurdle

Each region persisted its own local elapsed time, so cross-region story milestones had no deterministic timeline. The first local check also selected all unit tests because the changed acceptance document is outside the impact selector; TSDoc then caught a missing field in the new shared action type.

## Diagnosis and fix

Kept each region's crisis and hydraulic clock isolated, and added a separate saved campaign clock advanced only by accepted in-game action durations. Runtime dispatch is the single advancement boundary, including direct interactions and keyboard actions. Route reset leaves campaign time intact. An accessible status disclosure reports elapsed campaign time without using browser wall time or exposing character outcomes.

## Evidence

- Focused impact: 26 suites / 314 tests; 100% statements and branches for changed core files; ESLint, core parse, and duplication passed with zero clones.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check`: all 10 gates passed, 985 suites / 6,925 tests across five serial shards, zero clones, zero audit vulnerabilities.
- `npm run build`: passed; generated output includes the campaign clock module and updated THREEFOLD page.
- `git diff --check`: passed.
- Exact-head Full Check and Terraform Validate: pending push and CI dispatch; no full-coverage result claimed.

## Next-time guidance

Use the campaign clock as a deterministic input for cross-region milestones, but do not invent a fate threshold without matching authored evidence. Keep undiscovered character outcomes private from the campaign-status disclosure. Beads could not be updated because the shared Dolt access lock timed out; resume Bead tracking when the lock is available, without rebuilding or deleting its database.
