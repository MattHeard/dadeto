# Threefold player and NPC readability

- Unexpected hurdle: the renderer already had distinct YOU/NPC plaques and differently colored outlines, yet Mara and residents still looked like the same small humanoid at handheld scale.
- Diagnosis: the distinction depended too heavily on small text and palette accents; the body art had similar narrow bounds, and Mara's player arrow was only six rows tall.
- Fix: widened Mara's cyan mantle with a third row and expanded the player beacon to eight rows, preserving character bounds and collision behavior. Updated renderer assertions to verify the wider body silhouette and beacon dimensions.
- Evidence: `npx jest test/core/browser/game/threefold-renderer.test.js --runInBand --coverage=false` passed (52 tests); `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates and 1,045 impact suites (7,664 tests) across six shards; `npm run build` passed; `git diff --check` passed.
- Next-time guidance: identity cues must remain readable in the 160x144 render without requiring the player to read small labels; preserve visual distinctions in silhouette and shape as well as color.
