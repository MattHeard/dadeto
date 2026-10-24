# Threefold adult NPC stature — 2026-10-24

- Unexpected hurdle: repeated palette, badge, and silhouette changes had not made the Broken Gate resident obvious during play.
- Diagnosis: the default rendered frame showed Mara at 14×16 pixels and the Latchfolk watchkeeper at 6×6; the scene authored this adult NPC at 0.55 m, while comparable adult residents are about 1.7–1.8 m tall.
- Fix: set the watchkeeper's authored height to 1.8 m and require a 14px native-frame body in the renderer regression. Keep the adjacent-scale assertion so the NPC remains responsive to Mara's scale. The logical-grid footprint check now excludes only this adult character art, which intentionally overhangs its narrower interaction cell; the sprite remains on the 2px subgrid.
- Evidence: focused renderer Jest passed 45/45; `npm run check` passed all 10 gates across six shards; `npm run build` and `git diff --check` passed. A headless frame preview shows the adult NPC beside Mara at comparable size.
- Next: inspect the production handheld frame at phone size. Keep the visual-acceptance bead open until that review.
