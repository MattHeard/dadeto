# Threefold player/NPC visibility follow-up — 2026-10-24

- Unexpected hurdle: the user still could not distinguish Mara from residents after the first 10 × 10 player-only arrow was added.
- Diagnosis: the marker appeared in the fixed 160 × 144 render but was too small to dominate the characters at phone scale.
- Chosen fix: enlarge the player-only arrow into a dark-outlined 20 × 20 icon around a 16 × 16 pale arrow, keeping every cell on the 2px grid and touching Mara's sprite. Residents retain their magenta NPC tags and violet broad-brim silhouettes.
- Evidence: focused Threefold renderer Jest passed 47/47; Threefold-only coverage passed 45 suites / 692 tests, with 98.99% branches and no uncovered lines in the new marker implementation; `npm run check` passed all 10 gates, `npm run build` passed, and 84 manuals validated. Headless Chromium at 393 × 873 measured a 160 × 144 backing canvas rendered at 343 × 308.7 CSS pixels, no page errors; reviewed `/tmp/threefold-player-arrow-outline-phone.png`.
- Next-time guidance: a semantic label alone is insufficient evidence of gameplay readability; review the actual 160 × 144 scene at phone size and make the player cue substantially larger than an NPC tag.

## Coverage micro-loop

- The full coverage report also exposed an untested no-op when interrupting the Assembly plan after it had committed. Added a return-tide regression that advances through the rise, repeats the late interrupt, and proves the committed state is preserved.
- Evidence: focused coverage run for `return-tide.js` passed 17 tests and recorded a hit on the previously missed `return-tide.js:280` arm. A follow-up `npm run check` passed all 10 gates. Global coverage remains open in `dadeto-3jh8`.

- A second small coverage slice adds the committed-but-reopened Final Seal presentation. Mara can reopen the seal after the Assembly commitment, but the scene must still say the Choir branches remain permanently severed.
- Evidence: focused coverage run for `return-tide-presentation.js` passed 10 tests; the committed message's two `sealClosed` branches are both hit. `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six impact shards, with zero clones and vulnerabilities.
