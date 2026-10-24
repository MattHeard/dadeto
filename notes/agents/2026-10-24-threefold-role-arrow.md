# Threefold player/NPC role arrow — 2026-10-24

- Unexpected hurdle: palette, sprite silhouette, and `YOU`/`NPC` labels still left the player character unclear during play.
- Diagnosis: both character bodies are small within the fixed 160 × 144 screen, so the role cues depended too much on subtle body pixels and text.
- Chosen fix: add a pale, 10 × 10, 2px-grid arrow touching Mara's sprite; it points down from above her or up from below and is reserved for the player. NPCs retain their broad brim and violet robe.
- Evidence: focused renderer Jest passed 47/47; `npm run check` passed all 10 gates, 1,045 suites / 7,644 tests; `npm run build` passed. Headless Chromium at 393 × 873 measured the canvas at 160 × 144 backing and 343 × 308.7 CSS pixels with no page errors; reviewed `/tmp/threefold-player-arrow-phone.png`.
- Next-time guidance: inspect role cues in the phone-size game canvas and verify shape and attachment, not only color and label metadata. The scoped renderer coverage evaluator still reports older uncovered paths tracked by `dadeto-3jh8`; the newly added arrow code has no uncovered branches or lines.
