# Return Tide presentation coverage increment — 2026-10-26

## Diagnosis

The Full Check artifact for commit 68bfd08 identified one uncovered outcome in the accessible Return Tide copy for an unavailable Assembly plan. Existing presentation tests covered an intact Final Seal with no surviving representative, but not the alternate case where the physical seal itself is destroyed.

## Fix and evidence

Added an explicit destroyed-seal Return Tide fixture and asserted that the presentation reports the mechanism loss. This exercises the existing distinction without changing narrative behavior.

- `npm run check:impact:run -- --files src/core/browser/game/threefold/return-tide-presentation.js test/core/browser/game/threefold-return-tide-presentation.test.js` — passed 22 suites / 273 tests; changed core file has 100% statements, branches, functions, and lines.
- `npm run check` — passed all 10 gates; log `/tmp/dadeto-return-tide-presentation-2026-10-26-check.log`.
- `npm run build` — passed; log `/tmp/dadeto-return-tide-presentation-2026-10-26-build.log`.

## Next time

Poll the exact-head Full Check for commit b888142 and use its report to refresh remaining global gaps. Do not close the global coverage issue until suite-wide thresholds pass.
