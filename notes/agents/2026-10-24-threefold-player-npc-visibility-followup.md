# Threefold player/NPC visibility follow-up — 2026-10-24

- Unexpected hurdle: the user still could not distinguish Mara from residents after the first 10 × 10 player-only arrow was added.
- Diagnosis: the marker appeared in the fixed 160 × 144 render but was too small to dominate the characters at phone scale.
- Chosen fix: enlarge the player-only arrow into a dark-outlined 20 × 20 icon around a 16 × 16 pale arrow, keeping every cell on the 2px grid and touching Mara's sprite. Residents retain their magenta NPC tags and violet broad-brim silhouettes.
- Evidence: focused Threefold renderer Jest passed 47/47; Threefold-only coverage passed 45 suites / 692 tests, with 98.99% branches and no uncovered lines in the new marker implementation; build passed. Headless Chromium at 393 × 873 measured a 160 × 144 backing canvas rendered at 343 × 308.7 CSS pixels, no page errors; reviewed `/tmp/threefold-player-arrow-outline-phone.png`. The required final fast check and manual validation are running / pending.
- Next-time guidance: a semantic label alone is insufficient evidence of gameplay readability; review the actual 160 × 144 scene at phone size and make the player cue substantially larger than an NPC tag.
