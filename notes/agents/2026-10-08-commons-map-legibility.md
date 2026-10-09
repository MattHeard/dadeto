# Commons map legibility and feedback loop

- Unexpected hurdle: focused Jest invoked through the package `test` script tried to run the full serial coverage shard and hung in the sandbox; use the installed Jest binary with `--runInBand --no-coverage` for bounded targeted feedback.
- Diagnosis: the Commons tile generator inferred paths from coordinate modulo patterns, the player reused the autonomous sprite with no marker, movement retained stale toast on successful steps, and clue count only named a number. New reports matched those source behaviors.
- Fix: authored explicit walkways connecting the start through the WEIR exit and across the Living Weir approach; reduced Commons ground detail; added a controlled-player chevron and persistent route strip; movement now reports steps, path edges, residents, and map transitions; clue status names evidence sources and manual clarifies conversations do not count; repair and assignment guidance now gives map-level next steps.
- Verification: three focused Commons suites pass (24 tests); focused ESLint, `npm run build`, manuals, tsdoc, and duplication pass. `npm run check` completed with 2/10 failures caused by sandbox `EPERM` subprocess restrictions and unavailable npm audit network access; bead stays open pending terminal aggregate success.
- Next time: keep instructional HUD copy under two 30-character rows and assert pixel-frame player markers and map route metadata alongside interaction states.

## Flow-board footer follow-up (2026-10-09)

- Diagnosis: the A/B/Y instruction was one 32-character row at x=8 in a 160px view, extending past the right edge; the single footer also packed three controls together.
- Fix: split controls across two explicit, shorter rows: `A CARVE/OPEN · B ROUTE` and `Y FLOW · X RETURN`, with separate baselines. This keeps every label within the board's logical width.
- Verification: Commons focused Jest suites pass (3 suites / 24 tests), focused ESLint passes, `npm run build` passes. Regression checks assert all board text stays within 160px and footer baselines are present.
