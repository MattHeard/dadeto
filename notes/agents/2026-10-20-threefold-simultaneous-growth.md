# THREEFOLD Simultaneous Growth Retrospective

- Unexpected hurdle: the simulation stores the rat and watchkeeper in separate fate models, so their simultaneous impact had no regression guard even though the growth preview and commit paths already compose.
- Diagnosis: used adjacent, non-overlapping bounds and placed Mara just inside the rat; the next physical growth footprint reaches the watchkeeper while still overlapping the rat.
- Fix: added regression coverage for the read-only preview and both lethal labels, one committed growth action updating both fates, and save/import preserving both outcomes. No authored scene or simulation code changed.
- Evidence: `npm run test:impact -- --files test/core/browser/game/threefold-growth-occupant.test.js` passed (1 suite / 12 tests); `npm run check` passed all 10 local gates with zero clones. Exact-head Full Check is required before closing the Bead.
- Next-time guidance: test cross-entity growth with physically adjacent bounds so the fixture proves the expanding footprint, rather than overlapping target volumes, causes both outcomes.
- Open boundary: this proves composition for the authored rat and watchkeeper only. Generic creature registries, multiple arbitrary wildlife fates, and unloaded-world chunks remain outside this slice.
