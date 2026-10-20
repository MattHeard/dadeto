# THREEFOLD Harness

## Local Run Instructions

1. Install prerequisites: `npm install`.
2. Build the standalone page and copied game modules: `npm run build`.
3. Serve the generated static site with `npm run start`, then open `/threefold/`.
4. Run `npm run test:impact` for change-selected Jest suites without coverage instrumentation. The rat encounter, rescue and Latchfolk branches exercise simulation, save migration, renderer, runtime, page and shared Mosslight input tests.

## Small-World Hydraulic Model

Run `npm run test:impact -- --files test/core/browser/game/threefold-water.test.js` to exercise the current pure water-transfer primitive. An open port moves water down the physical surface-height gradient, conserves cubic-metre volume, and stops at the port sill or hydrostatic equalization. Closed ports, equal surfaces, zero-duration steps, and dry sources leave both chambers unchanged. This solver is not wired into a playable region yet.

## Small-World Sluice Puzzle Model

Run `npm run test:impact -- --files test/core/browser/game/threefold-water-puzzle.test.js test/core/browser/game/threefold-water.test.js` to exercise the pure sluice state model and shared hydraulic solver. The valve toggles only at scale −2; explicit time steps move conserved water into the lower basin, and a crossing at scale −1 or larger requires the physical surface to reach 0.3 metres. This model is not yet wired into browser input, rendering, or save persistence. Do not change the Broken Gate's visual-only flood behavior while integrating the separate small-world puzzle.

## Expected Observable Outputs

- The page shows a Mosslight-style handheld frame labelled 160 × 144.
- The opening view reports scale 0, Anchor 8, and the rising crisis stage.
- At the starting position, the west wall is highlighted and the HUD says `A BREAKS WEST WALL`; pressing A still performs the growth. At positions where the next rung hits no intact geometry, the regular message remains and no structure is highlighted.
- Enter the watchkeeper bounds from outside while at scale −2, then grow: the frame highlights the watchkeeper and says `A KILLS LATCHFOLK` even though Mara's smaller body is already inside their volume. A remains available, commits `lost`, and save/import preserves the identity outcome. No warning appears for an already safe/lost watchkeeper, locked growth, or when the next body misses their bounds.
- At scale −2 or −1, reach the authored rat to see the in-frame `A FIGHT · X BYPASS` prompt. A repels it at −2 and kills it at −1; X bypasses without killing it. When Mara fits wholly inside the rat at scale −2, the frame highlights the growth consequence, A grows through and kills it, and X still bypasses. Each outcome advances game time and its action cause survives save/export/import; schema-v1 saves restore the rat as present and schema-v2 saves infer the prior fight/bypass cause for the schema-v3 save.
- A visible TIDE meter starts empty, fills with deterministic crisis minutes, and changes color at the authored stages.
- Arrows move; A grows unless the rat is in reach, when A fights; if Mara fits inside the rat at scale −2, A grows through it instead; B shrinks; E or gamepad left shoulder warns the Latchfolk watchkeeper, rescues passengers at the ferry, or withdraws through the upland road; X waits 15 in-game minutes unless the rat is in reach, when X bypasses it; Y saves. The touch interaction control is also available.
- At the mooring before surge, interact once to rescue one of two passenger groups, then interact again to rescue the second. The frame shows one safe and one still aboard between interactions. At surge the ferry is lost; any group still aboard is lost, and a partial rescue remains one safe / one lost. Waiting through surge without rescuing them records both losses.
- Reach the marked watchkeeper in the lower settlement and warn them before surge; warned Latchfolk reach higher ground, while unwarned Latchfolk are lost. This outcome is independent of the ferry branch and survives save/export/import.
- Walk northwest to the marked upland road and interact to withdraw. The remaining crisis resolves deterministically to aftermath; earlier rescues and warnings persist, and later world actions are inert. The withdrawn outcome survives save/export/import.
- After surge loses the ferry, shrink to scale −2 and reach the marked locking pawl beside the forced-open relief gate. Interact to restore the gate; ferry/passenger/Latchfolk losses remain, the gate survives save/export/import, and lower water recedes by aftermath.
- Grow through the marked signal station to destroy it. After the crisis reaches aftermath, the console is gone and the frame says that a report cannot be sent; follow the open route to the upland road and interact to close by departure. With an intact station, interact at its console after aftermath to close by report. Both closure branches survive save/export/import.
- The west wall remains damaged after reload when Mara grows through it.
- The focused Jest suite passes and exits with status 0.
- Build artifacts are written under `public/`; full check evidence is written under `.tmp/` and coverage reports under `reports/coverage/`.

## Troubleshooting Hooks

- Verbose mode command: `npm run check`.
- Log location: `.tmp/threefold-check.log` for an explicitly logged local run.
- Cleanup command: remove only the task-specific `.tmp/threefold-*` files after retaining needed evidence.
- If the canvas is blank, verify that `/threefold/game.js` and `/core/browser/game/threefold/page.js` were copied into `public/`.
