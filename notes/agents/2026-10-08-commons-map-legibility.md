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

## Player direction and Weir contrast follow-up (2026-10-09)

- Visual approaches compared in code: (1) the earlier fixed overhead chevron, (2) directional face pixels alone, and (3) a PC-only backpack/face silhouette plus a tiny three-pixel arrow aligned to facing. Chose the combined third option: the arrow communicates movement direction while the shoulder/backpack and cyan outfit distinguish the PC from residents without consuming HUD rows.
- Weir adjustment: pale sand bank, dark teal channel, bright channel edge and much brighter resident clothing accents; player cyan is kept distinct from deep water. Art regression checks assert color presence and a luminance gap between bank/water and PC/water.
- Movement feedback now omits routine `Moved <direction>` announcements; it retains concise target prompts and useful blocked/entry messages.
- Verification: three focused Commons suites pass (25 tests); focused ESLint, tsdoc, and build pass.

## Weir background contrast follow-up (2026-10-09)

- Diagnosis: the previous bright sand (`#dfcfa0`), near-black channel edge, pale glints, and cyan water produced a large value jump on nearly every small tile. The high-frequency stripes competed with 12px actors and props.
- Fix: narrowed the Weir terrain luminance range with muted sage banks and slate teal water; removed bright ripple flecks and hard dark channel borders; recolored blocked shore structures into the same quiet range. Foreground sprites, signs, and interaction landmarks retain their brighter accents.
- Verification: native 160x144 frame saved at `/tmp/commons-living-weir-revised.png`; tests assert terrain luminance range stays below 0.15 and PC-to-water separation remains above 0.2. Focused Commons suites pass (25 tests), as do ESLint, tsdoc, and build.

## Opening scene follow-up (2026-10-09)

- Unexpected hurdle: the Commons start already had a route instruction, but the NPCs and first clue did not present the value conflict as a live situation.
- Diagnosis: June was visible at the start, while Elian was scheduled only in the Weir; the first screen had no flood evidence or concrete gathering prop.
- Fix: stage both residents in Canopy Commons during the morning, add readable meal crates and an early-flood marker, record the two perspectives separately from clue evidence, and make the first-district strip progress from flood inspection to hearing both neighbors and then the existing Weir route. The marker does not satisfy the old-gauge requirement for the seasonal pact.
- Verification: focused Commons Jest suites pass (3 suites / 26 tests); `npm run build` and aggregate `npm run lint` pass. `npm run check` reports test/core-parse child-process `EPERM` and audit exit 1; its final summary lists core-parse and audit as the two failed checks. Bead remains open pending a terminal green aggregate check.
- Next time: use the first screen to show a concrete shared problem and two reasons people care about it; keep investigation records, clue evidence, and binding charter choices as distinct state.

## Flow-board first-play clarity (2026-10-09)

- Unexpected hurdle: a player reached the flow board with `3/3 EDITS` and `0%` inlet progress, but the board did not state its goal or the next button sequence.
- Diagnosis: route, channel edit, gate operation and simulation advance were all named only as controller verbs; the two editable channels and gate were unlabeled, and an exhausted wrong edit had no recovery prompt.
- Fix: name the inlet goal, label channel cells 8/12 and gate G, show route/gate/inlet/edit state, display the next route-specific step, and explain the exact route-12-gate-flow sequence plus reset path in the manual. Exiting with an exhausted blocked channel now points to the reset action.
- Verification: Commons Art/Simulation/Runtime/Puzzle focused suites pass (4 suites / 33 tests); the simulation regression follows the documented button sequence. Full lint/build/aggregate evidence to be recorded in the bead after evaluator runs.
- Next time: make the next valid move explicit on stateful puzzle screens, especially when a bounded resource can be exhausted.

## Flow-board completion clarity (2026-10-09)

- Unexpected hurdle: a solved screenshot showed `WATER INLET REACHED` while the footer still said `Y TEST FLOW`, making success ambiguous.
- Diagnosis: completion changed the next-step row but left the active-play control hint unchanged.
- Fix: completed boards now say `PUZZLE SOLVED · INLET FILLED` and replace the flow control with `X RETURN · FOOTBRIDGE WEST`; manual describes the same next step.
- Verification: Commons Art/Simulation/Runtime/Puzzle suites pass (4 suites / 34 tests); focused ESLint, manuals check (78), build, and diff check pass.
- Next time: switch every instruction from action guidance to progression guidance as soon as a puzzle reaches its terminal state.

## Integer game versioning (2026-10-09)

- Unexpected hurdle: the `v1` save key represented storage identity/schema, but there was no release number to compare shipped game changes.
- Diagnosis: save compatibility and player-facing release identity had been conflated by the only existing version-like marker.
- Fix: introduced integer `COMMONS_GAME_VERSION`, exposed it in standalone page text and embedded frame metadata, and documented the bump rule and history separately from save keys.
- Verification: focused Commons Runtime/Art suites pass (15 tests); focused ESLint, manuals check (78), build, and diff check pass.
- Next time: increment the integer and add a changelog entry for every shipped gameplay, story, art, control, or player-facing documentation change.

## Puzzle and RPG integration (2026-10-09)

- Unexpected hurdle: the flow board was an authored Weir object, but the Actions menu also opened the puzzle directly.
- Diagnosis: duplicate access skipped the physical space and made the river-routing trial feel disconnected from the story.
- Fix: removed the menu launch action, preserved menu reset for recovery, and made board interaction frame the trial as information for the footbridge agreement. Bumped the game to version 2 and updated the manual and harness.
- Verification: focused Commons Art/Simulation/Runtime/Puzzle tests, lint, manuals check, and build results recorded in the owning bead.
- Next time: route authored activities through their world fixture and state the narrative reason for using them at the point of interaction.

## World-first actions and compact HUD (2026-10-09)

- Unexpected hurdle: the board puzzle had a second route through the Actions menu, and its reset action existed only as a menu command; Repair and Listen were generic actions detached from their story locations.
- Diagnosis: menu entries provided convenience but bypassed place and character context, while the shared status strip permanently spent four rows on status and clue count.
- Fix: removed the Actions page, made A interactions the Survey verb, moved Repair to Tomas and the footbridge, made Habitat Listening operate at the habitat scope, and put a confirmation reset panel beside the flow board. Reset clears only the unresolved water-route evidence. Replaced the four-row overworld strip with one contextual instruction, retained overlay guidance, and bumped the game to version 3. The flow-board conversation now frames its test as evidence for the footbridge choice, following the transcript's emphasis on giving actions a narrative reason and stakes.
- Verification: focused Commons Art/Simulation/Runtime/Puzzle suites pass (4 suites / 36 tests); `npm run manuals:check` validates 78 manuals; `npm run build`, focused ESLint, and `npm run duplication` pass with 0 clones. `npm run check` finishes 8/10 gates: test and core-parse fail because sandbox child-process spawning returns EPERM; npm audit exits 1 because registry access is unavailable. TSDoc initially caught a helper rectangle type mismatch; the JSDoc type was corrected and the aggregate rerun passes TSDoc. Keep the owning bead open until the environment-blocked gates can run successfully.
- Next time: place each verb at the object or person that makes it meaningful; only keep a HUD instruction when it helps with the next decision.

## Two-row scrollable field note (2026-10-09)

- Unexpected hurdle: the compact one-line note truncated actionable prompts while leaving the lower part of the handheld blank.
- Diagnosis: the map was clipped at row 98, but only a 12px strip was used; long notes were shortened to one line rather than wrapped.
- Fix: extend the map to row 109, fill the bottom 35px with two contextual text rows, pair a short prompt with the district label, and show longer world-interaction notes in a two-row reader. Up/down scroll one line, A advances two lines, B closes; a vertical marker shows relative position. Reader input is active only in the unobstructed world layer, so menus and dialogue keep their existing controls. Bumped game version to 4 and updated the standalone control legend, manual and harness.
- Verification: focused Commons Art/Simulation/Runtime/Puzzle suites pass (4 suites / 38 tests); `npm run build`, `npm run manuals:check` (78 manuals), focused ESLint, `npm run duplication` (0 clones), and `npm run tsdoc:check` pass. `npm run check` passes 8/10 gates; test and core-parse fail because sandbox child-process spawning returns EPERM, and npm audit exits 1 because registry access is unavailable. Keep the owning bead open pending those environment-blocked gates.
- Next time: spend the 160×144 frame deliberately: preserve map height, wrap essential prompts, and only capture controls while a note is actually being read.

## Final-page close and solid inspectable fixtures (2026-10-09)

- Unexpected hurdle: A advanced field notes but had no close behavior at the end; world objects could be walked through despite being positioned as inspectable fixtures.
- Diagnosis: reader paging always clamped to the last offset, and shared `isBlocked` checked only map bounds and authored blocked cells.
- Fix: A now advances by two rows until already on the final page, then closes the note; B remains an immediate close. Shared collision checks now include object coordinates, keeping fixture targeting available from adjacent cells across both handheld RPGs. Bumped Commons game version to 5 and updated manual, harness, acceptance and changelog.
- Verification: focused Commons Art/Simulation/Runtime/Puzzle and Mosslight Valley suites pass (5 suites / 67 tests); `npm run build`, `npm run manuals:check` (78 manuals), focused ESLint, `npm run duplication` (0 clones), and `npm run tsdoc:check` pass. `npm run check` ends 8/10 with core-parse child-process EPERM and npm audit registry access failure; its test subprocess also logs spawnSync EPERM, while focused game suites pass. Keep the owning bead open pending those environment-blocked checks.
- Next time: when a UI action is context-sensitive, define its behavior at start, middle and terminal states; make inspection range and collision rules agree.
