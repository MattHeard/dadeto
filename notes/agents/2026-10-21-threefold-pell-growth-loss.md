# THREEFOLD Weftways negotiator loss

## Unexpected hurdle

Weftways displayed the growth preview for Pell, but committed growth did not save his death. Its scene-specific reducer returns before the generic high-world growth handler, so the earlier preview-only implementation left the encounter unchanged. The authored spawn also started at scale −2 and did not unlock −3, where Mara can fit inside Pell's bounds.

## Diagnosis and fix

`stepWeftwaysScene` used `commitSmallWorldSceneAction` but returned an empty update for every non-interaction. It now records the existing `{ creatureId, cause: 'growth' }` result on growth. Weftways now unlocks scale −3 while keeping the initial scale at −2. The saved death drives the missing Pell marker and conversation, routes ledger discovery to the caravan circle, and lets the relay keeper carry crossing and repair discussions without inventing Pell's answer.

No Pell-specific save field or migration was needed: the shared encounter growth-death list and existing player scale-unlock field persist through the route save codec.

## Evidence

`DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check:impact:run -- --files src/core/browser/game/threefold/weftways.js src/core/browser/game/threefold/simulation.js src/core/browser/game/threefold/renderer.js src/core/browser/game/threefold/page.js test/core/browser/game/threefold-weftways.test.js test/core/browser/game/threefold-weftways-page.test.js` passed 25 related suites / 306 tests. Each changed core file has no uncovered statements or branches; ESLint, core-parse, and duplication passed with zero clones. `npm run check` then passed all 10 fast local gates across five serial all-unit shards (984 suites / 6,915 tests), with zero clones and zero audit vulnerabilities. `npm run build`, `npm run manuals:check` (79 manuals), and `npm run tsdoc:check` passed. Exact-head CI is pending after push; the shared Dolt lock prevented Beads updates.

## Next-time guidance

For small-world scenes, trace the selected scene reducer before relying on the generic growth branch. Exercise the authored scale unlock and physical overlap in the simulation, then verify the outcome through save/import and follow-up interactions. The shared Beads Dolt lock prevented issue reads and loop updates during this slice; retry tracker operations when the lock clears rather than altering the lock file.
