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

## Player selection-frame retry

- Unexpected hurdle: the user still could not connect the overhead arrow and offset `YOU` badge to Mara's small body.
- Diagnosis: the pointer read as a separate icon while the nearby resident's badge and silhouette dominated the scene.
- Chosen fix: replace the arrow with four cyan 2px-grid corner brackets framing Mara's entire sprite; retain her badge and leader as secondary role cues. Residents keep their broad-brim silhouette, violet coat, and magenta `NPC` badge.
- Evidence: renderer Jest passed 47/47; a regression checks frame bounds, spacing, 2px-grid alignment, player-only ownership, and no overlap with either body. `npm run build` passed. The 393 × 873 local preview at `/tmp/threefold-selection-frame-preview.png` shows the brackets enclosing Mara in the 160 × 144 screen.
- Next-time guidance: when a marker does not establish identity during play, attach the cue to the whole sprite and inspect the exact crowded gameplay frame before relying on colors or labels.

## Body-silhouette retry

- Unexpected hurdle: the user still could not distinguish Mara from residents after the body-framing brackets and role badges shipped.
- Diagnosis: the body art remained too similar when reduced to the handheld's 2px actor grid; external frames and text did not change the silhouettes themselves.
- Chosen fix: give Mara a tall pointed hood and a broad cyan cloak flare extending past the body, while residents keep their flat broad brim and straight violet robe. Mark actual player body cells separately from the outline so tests compare the character art without counting labels or the selection frame.
- Evidence: focused renderer Jest passed 48/48; normalized, color-blind body masks have 11 Mara-only and 14 resident-only 2px cells. `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six impact shards; `npm run build` passed. Local 393×873 Chromium capture `/tmp/threefold-player-npc-silhouette-phone.png` shows a 160×144 canvas at 343×309 CSS pixels with no page errors. The first local check found a max-statements lint warning; extracting the body-mask assertion into its own test resolved it on the passing rerun.
- Next-time guidance: if badges and frames do not help players identify a character, compare normalized body masks and change the body pixels rather than adding another detached symbol.

## Legacy Return Tide presentation coverage slice

- Unexpected hurdle: the exact-head Full Check still fails the global 100% branch threshold after the player/NPC fix; run 40130764297 reported 99.433% with 119 uncovered arms.
- Diagnosis: the presentation supports pre-plan saves whose tide had already risen, but the regression suite never exercised normalization of a missing plan status into the legacy state.
- Chosen fix: add one compatibility regression that removes the plan status from a saved-state fixture, normalizes it at the rise, and verifies the player-facing explanation does not invent an autonomous Assembly action retroactively.
- Evidence: focused coverage passed 1 suite / 10 tests. The previously uncovered `return-tide-presentation.js:99` branch now records counts `[1, 7]`; `line 106` remains a separate alternative. No threshold or exclusion changed. The exact-head Full Check for the preceding commit is still running; global coverage remains open in `dadeto-3jh8`.
- Next-time guidance: for migration states, exercise the public normalizer with an old-shape record so compatibility and user-facing presentation are tested together.
