# Threefold player-frame caller contract

`maraRoleFrame` is called only from `maraRoleLabel`. The caller exits for an empty sprite list before invoking the frame helper, so the helper's empty-list return was unreachable. The redundant guard was removed without changing rendering for valid scenes.

Evidence: focused Threefold renderer Jest passed 52/52; focused renderer coverage passed 52/52 and no longer reports the removed guard line. `npm run tsdoc:check`, `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` (10/10 gates), `npm run build`, Threefold spec refresh, and `git diff --check` passed. The change is a small coverage cleanup within the ongoing Threefold NPC readability and full-coverage work; it does not itself establish that NPCs are visually distinguishable on a physical device.

Next: push this change, inspect exact-head CI, and continue prioritizing visible silhouette/scale differences based on current rendering and playtest feedback.
