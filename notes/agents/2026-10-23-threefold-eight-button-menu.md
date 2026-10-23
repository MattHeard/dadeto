# Threefold eight-button menu loop — 2026-10-23

- Unexpected hurdle: legacy E/interact expectations remained in gameplay tests, while onboarding and save controls were asserted as standalone page content.
- Diagnosis: trace input from the Threefold wrapper through shared Mosslight actions, then identify all page-only guidance and utility bindings and the NPC geometry projections that ignore physical scale.
- Fix: route contextual use through A, put guide/travel/journal/campaign/save/system actions in a Y menu, boot straight into play, and rasterize NPCs from authored physical bounds relative to Mara. Keep Threefold's accepted actions constrained to the requested eight controls.
- Evidence: focused tests passed 10 suites / 154 tests; `npm run tsdoc:check`, `npm run build`, `npm run manuals:check` (82 manuals), full local `npm run check` (1,039 suites / 7,533 tests, six shards, zero clones), and `git diff --check` passed. Exact-head CI remains pending.
- Next time: update in-game guidance and interaction tests together; inspect every scale layout for NPC dimensions before treating the scale feature as complete.
