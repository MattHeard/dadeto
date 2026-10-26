# Return Tide projection coverage increment — 2026-10-26

## Diagnosis

The Full Check artifact for commit 68bfd08 identified an unexecuted resident-ID mapper in Return Tide projection. The shared projection test projected damaged hardware but supplied no resident death IDs, so the mapper never had a matching physical resident to remove.

## Fix and evidence

Extended the existing Belltops projection fixture with the canonical Sera death key and asserted the projected physical scene no longer contains her actor, while retaining the hardware projection assertion.

- `npm run check:impact:run -- --files src/core/browser/game/threefold/return-tide-projection.js test/core/browser/game/threefold-return-tide-runtime.test.js` — passed 21 suites / 263 tests; changed core file has 100% statements, branches, functions, and lines.
- `npm run check` — passed all 10 gates; log `/tmp/dadeto-return-tide-projection-2026-10-26-check.log`.
- `npm run build` — passed; log `/tmp/dadeto-return-tide-projection-2026-10-26-build.log`.

## Next time

Use the newest exact-head Full Check artifact for remaining global gaps. Keep the global coverage issue open until all aggregate thresholds pass.
