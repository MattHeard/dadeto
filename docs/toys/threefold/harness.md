# THREEFOLD Harness

## Local Run Instructions

1. Install prerequisites: `npm install`.
2. Build the standalone page and copied game modules: `npm run build`.
3. Serve the generated static site with `npm run start`, then open `/threefold/` for Broken Gate, `/threefold/?scene=sluice` for the Tidal Archive, `/threefold/?scene=silt-margin` for Silt Margin, or `/threefold/?scene=lantern-ward` for the city-scale district.
4. Run `npm run test:impact` for change-selected Jest suites without coverage instrumentation. The rat encounter, rescue and Latchfolk branches exercise simulation, save migration, renderer, runtime, page and shared Mosslight input tests.

## Small-World Hydraulic Model

Run `npm run test:impact -- --files test/core/browser/game/threefold-water.test.js` to exercise the water-transfer primitive. An open port moves water down the physical surface-height gradient, conserves cubic-metre volume, and stops at the port sill or hydrostatic equalization. Closed ports, equal surfaces, zero-duration steps, and dry sources leave both chambers unchanged. The solver drives the Tidal Archive puzzle; Broken Gate floodwater remains a visual consequence only.

Run `npm run test:impact -- --files test/core/browser/game/threefold-witness-ledger.test.js test/core/browser/game/threefold-episode.test.js test/core/browser/game/threefold-save.test.js test/core/browser/game/threefold-runtime.test.js test/core/browser/game/threefold-page.test.js test/core/browser/game/threefold-renderer.test.js test/core/browser/game/threefold-simulation.test.js test/core/browser/game/threefold-outcome.test.js` to cover pre-action knowledge, gate choice, deterministic consequences, linked repair, journal accessibility, v5 roundtrips, legacy migration, and eight-pixel rendering. Legacy episode expectations should assert outcome fields independently from the growing ledger; post-breach outcome changes append linked observation facts.

## Small-World Sluice Puzzle Model

Run `npm run test:impact -- --files test/core/browser/game/threefold-sluice-integration.test.js test/core/browser/game/threefold-water-puzzle.test.js test/core/browser/game/threefold-water.test.js test/core/browser/game/threefold-page.test.js test/core/browser/game/threefold-runtime.test.js test/core/browser/game/threefold-save.test.js test/core/browser/game/threefold-renderer.test.js` to cover the playable route, input, water transfer, rendering, and save migration. The valve toggles only within reach at scale −2; explicit action time moves conserved water, and the crossing barrier clears only when the lower surface reaches 0.3 metres and Mara is at scale −1 or larger. Save schema v4 stores the validated puzzle and elapsed game seconds under a separate key; schema-v1 through schema-v3 Broken Gate saves remain supported. Never connect the Broken Gate's visual-only flood to this hydraulic solver.

## Silt Margin Crossing

Run `npm run test:impact -- --files test/core/browser/game/threefold-silt-margin.test.js test/core/browser/game/threefold-page.test.js test/core/browser/game/threefold-save.test.js test/core/browser/game/threefold-renderer.test.js test/core/browser/game/threefold-runtime.test.js` to cover the route, scale, grid, both crossing routes, explicit-time hydraulic transfer, threshold collision, branch migration, and isolated save key. Guidance must happen in reach before the Choir signal can be sent. The valve works only at scale −4, volume stays conserved, and the water crossing cannot be bypassed through the sides. Growth while Mara intersects the root arch and guardian previews and persists their break/death and the disrupted signal. Schema-v1 Silt saves migrate to v2; unsupported versions and inconsistent branches are rejected.

Run `npm run test:impact -- --files test/core/browser/game/threefold-lantern-ward.test.js test/core/browser/game/threefold-page.test.js test/core/browser/game/threefold-save.test.js test/core/browser/game/threefold-renderer.test.js test/core/browser/game/threefold-runtime.test.js` to verify the +3 district preview, still-available growth, exact building and resident consequences, independent elapsed time, Mosslight grid, and save-key/export isolation. District actions must not advance Broken Gate episode, crisis, testimony, or witness state.

## Expected Observable Outputs

- The page shows a Mosslight-style handheld frame labelled 160 × 144.
- Every rendered canvas shape is positioned and sized on an eight-logical-pixel grid; terrain flecks and both scenes' water surfaces follow the same grid while the simulation values stay continuous and the scale change remains visible.
- A relief-gate breach records what the frame showed before the action, the selected growth step, and resulting gate/channel/settlement facts. Later observed changes and repair link to the original breach; the accessible Witness Ledger uses text nodes and adds no moral score. Legacy saves without a ledger load with an empty history.
- The standalone page uses eight-pixel spacing and control sizes, including the narrow-phone layout, and the face/system buttons are not rotated.
- The opening view reports scale 0, Anchor 8, and the rising crisis stage.
- At untouched start, the visible opening dialogue contains both the tide warning and dock worker's relay claim; the accessible testimony panel keeps the dock worker's and watchkeeper's accounts separate and leaves responsibility unresolved. Repeated unchanged frames do not rebuild the testimony list.
- At the starting position, the west wall is highlighted and the HUD says `A BREAKS WEST WALL`; pressing A still performs the growth. At positions where the next rung hits no intact geometry, the regular message remains and no structure is highlighted.
- Enter the watchkeeper bounds from outside while at scale −2, then grow: the frame highlights the watchkeeper and says `A KILLS LATCHFOLK` even though Mara's smaller body is already inside their volume. A remains available, commits `lost`, and save/import preserves the identity outcome. No warning appears for an already safe/lost watchkeeper, locked growth, or when the next body misses their bounds.
- At scale −2 or −1, reach the authored rat to see the in-frame `A FIGHT · X BYPASS` prompt. A repels it at −2 and kills it at −1; X bypasses without killing it. When Mara fits wholly inside the rat at scale −2, the frame highlights the growth consequence, A grows through and kills it, and X still bypasses. Each outcome advances game time and its action cause survives save/export/import; schema-v1 saves restore the rat as present and schema-v2 saves infer the prior fight/bypass cause for the schema-v3 save.
- A visible TIDE meter starts empty, fills with deterministic crisis minutes, and changes color at the authored stages.
- Open `/threefold/?scene=sluice` to enter the Tidal Archive through the shared 160 × 144 Mosslight frame. The diagram shows the two physical water levels, valve state, and sealed/open crossing.
- Open `/threefold/?scene=silt-margin` to enter at scale −4 (2.26 cm). The grid-aligned handheld scene shows the dew crossing, fine valve, root arch, guardian, and Choir root. Guide the guardian with E, open the valve, wait until the crossing falls below 0.025 metres, cross, then send the signal; or grow through the root arch and guardian to persist the broken geometry, death, and signal disruption. Rendering must not quantize the stored physical position.
- At the starting valve, press E to open it. It is available only within reach at scale −2; the water advances during the action. Press X to wait 15 explicit in-game minutes; the upper reservoir drains and lower basin rises while the total cubic-metre volume remains constant. Pause and browser wall time do not move water.
- Grow to scale −1. The crossing remains blocked until the lower surface reaches 0.3 metres, then the barrier is omitted from movement collision. Shrinking below −1 closes it again until Mara grows back to the required scale.
- Save and reload or export/import the Tidal Archive. Its water and elapsed time restore from schema v4 without reading or overwriting the Broken Gate save key. Existing schema-v1, schema-v2, and schema-v3 Broken Gate saves continue to migrate.
- Arrows move; A grows unless the rat is in reach, when A fights; if Mara fits inside the rat at scale −2, A grows through it instead; B shrinks; E or gamepad left shoulder warns the Latchfolk watchkeeper, rescues passengers at the ferry, or withdraws through the upland road; X waits 15 in-game minutes unless the rat is in reach, when X bypasses it; Y saves. The touch interaction control is also available.
- At the mooring before surge, interact once to rescue one of two passenger groups, then interact again to rescue the second. The frame shows one safe and one still aboard between interactions. At surge the ferry is lost; any group still aboard is lost, and a partial rescue remains one safe / one lost. Waiting through surge without rescuing them records both losses.
- Reach the marked watchkeeper in the lower settlement and warn them before surge; warned Latchfolk reach higher ground, while unwarned Latchfolk are lost. This outcome is independent of the ferry branch and survives save/export/import.
- Walk northwest to the marked upland road and interact to withdraw. The remaining crisis resolves deterministically to aftermath; earlier rescues and warnings persist, and later world actions are inert. The withdrawn outcome survives save/export/import.
- After surge loses the ferry, shrink to scale −2 and reach the marked locking pawl beside the forced-open relief gate. Interact to restore the gate; ferry/passenger/Latchfolk losses remain, the gate survives save/export/import, and lower water recedes by aftermath.
- Grow through the marked signal station to destroy it. After the crisis reaches aftermath, the console is gone and the frame says that a report cannot be sent; follow the open route to the upland road and interact to close by departure. With an intact station, interact at its console after aftermath to close by report. Both closure branches survive save/export/import.
- The west wall remains damaged after reload when Mara grows through it.
- The focused Jest suite passes and exits with status 0.
- The integration and existing Broken Gate suites pass; the Broken Gate opening view, crisis, flooding, and save behavior remain unchanged.
- Build artifacts are written under `public/`; full check evidence is written under `.tmp/` and coverage reports under `reports/coverage/`.

## Troubleshooting Hooks

- Verbose mode command: `npm run check`.
- Log location: `.tmp/threefold-check.log` for an explicitly logged local run.
- Cleanup command: remove only the task-specific `.tmp/threefold-*` files after retaining needed evidence.
- If the canvas is blank, verify that `/threefold/game.js` and `/core/browser/game/threefold/page.js` were copied into `public/`.
