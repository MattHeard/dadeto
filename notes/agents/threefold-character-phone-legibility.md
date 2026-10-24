# Threefold character phone legibility

- **Unexpected hurdle:** NPC and player art, role labels, silhouettes, and body sizing had been changed repeatedly, but the characters still looked indistinct in a phone screenshot.
- **Diagnosis:** the canvas retained its native 160 × 144 backing size and was displayed at roughly 1× CSS size inside a much wider handheld bezel. Character details therefore stayed too small on phone screens.
- **Fix:** set `.screen-glow` to fill the frame; the canvas CSS already scales to its parent with nearest-neighbor rendering. Keep its 160 × 144 backing dimensions unchanged. Add a page regression for the full-width display and document the phone behavior.
- **Evidence:** focused page and renderer Jest suites passed 89 tests; `npm run build`, `npm run manuals:check` (84 manuals), and `git diff --check` passed; elevated `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates. Commit `64fb5f2` deployed in run `40124385094`; at 393 × 873 the native 160 × 144 canvas displays at 343 × 309 CSS pixels with zero page errors, and the live screenshot shows distinct player and resident markers and silhouettes (`/tmp/threefold-live-phone-legibility.png`).
- **Next time:** check both backing dimensions and CSS `getBoundingClientRect()` dimensions before redesigning sprites; a correct native canvas can still be presented at an unusably small size.
