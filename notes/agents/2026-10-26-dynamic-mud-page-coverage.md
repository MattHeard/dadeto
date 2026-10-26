# Dynamic MUD page coverage increment — 2026-10-26

## Diagnosis

The exact Full Check artifact for commit 68bfd08 identified one uncalled no-op cleanup callback in the Dynamic MUD page adapter's missing-required-element path.

## Fix and evidence

Extended the existing missing-node regression to invoke the returned disposer, proving the adapter's page lifecycle contract even when it never binds listeners.

- `npm run check:impact:run -- --files src/core/browser/game/dynamic-mud/page.js test/core/browser/game/dynamicMud-page.test.js` — passed 1 suite / 3 tests; changed core file has 100% statements, branches, functions, and lines.
- `npm run check` — passed all 10 gates; log `/tmp/dadeto-dynamic-mud-page-2026-10-26-check.log`.
- `npm run build` — passed; log `/tmp/dadeto-dynamic-mud-page-2026-10-26-build.log`.

## Next time

Use a newer exact-head Full Check artifact to refresh global gaps. Keep the global coverage issue open until all four aggregate thresholds pass.
