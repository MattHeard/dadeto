# THREEFOLD Harness

## Local Run Instructions

1. Install prerequisites: `npm install`.
2. Build the standalone page and copied game modules: `npm run build`.
3. Serve the generated static site with `npm run start`, then open `/threefold/`.
4. Run `npm run test:impact` for change-selected Jest suites without coverage instrumentation. The rescue and Latchfolk branches exercise simulation, save migration, renderer, runtime, page and shared Mosslight input tests.

## Expected Observable Outputs

- The page shows a Mosslight-style handheld frame labelled 160 × 144.
- The opening view reports scale 0, Anchor 8, and the rising crisis stage.
- A visible TIDE meter starts empty, fills with deterministic crisis minutes, and changes color at the authored stages.
- Arrows move, A grows, B shrinks, E or gamepad left shoulder warns the Latchfolk watchkeeper, rescues passengers at the ferry, or withdraws through the upland road; X waits 15 in-game minutes, and Y saves. The touch interaction control is also available.
- At the mooring before surge, interact to evacuate passengers; surge later loses the ferry but preserves rescued passengers. Waiting through surge without rescuing them records their loss.
- Reach the marked watchkeeper in the lower settlement and warn them before surge; warned Latchfolk reach higher ground, while unwarned Latchfolk are lost. This outcome is independent of the ferry branch and survives save/export/import.
- Walk northwest to the marked upland road and interact to withdraw. The remaining crisis resolves deterministically to aftermath; earlier rescues and warnings persist, and later world actions are inert. The withdrawn outcome survives save/export/import.
- The west wall remains damaged after reload when Mara grows through it.
- The focused Jest suite passes and exits with status 0.
- Build artifacts are written under `public/`; full check evidence is written under `.tmp/` and coverage reports under `reports/coverage/`.

## Troubleshooting Hooks

- Verbose mode command: `npm run check`.
- Log location: `.tmp/threefold-check.log` for an explicitly logged local run.
- Cleanup command: remove only the task-specific `.tmp/threefold-*` files after retaining needed evidence.
- If the canvas is blank, verify that `/threefold/game.js` and `/core/browser/game/threefold/page.js` were copied into `public/`.
