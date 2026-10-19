# THREEFOLD Harness

## Local Run Instructions

1. Install prerequisites: `npm install`.
2. Build the standalone page and copied game modules: `npm run build`.
3. Serve the generated static site with `npm run start`, then open `/threefold/`.
4. Run focused suites with `node scripts/run-jest.js --runInBand test/core/browser/game/threefold-encounter.test.js test/core/browser/game/threefold-runtime.test.js test/core/browser/game/threefold-save.test.js test/core/browser/game/threefold-renderer.test.js`.

## Expected Observable Outputs

- The page shows a Mosslight-style handheld frame labelled 160 × 144.
- The opening view reports scale 0, Anchor 8, and the rising crisis stage.
- A visible TIDE meter starts empty, fills with deterministic crisis minutes, and changes color at the authored stages.
- Arrows move; A grows or fights when the rat is in reach; B shrinks; X waits 15 in-game minutes or bypasses the rat when in reach; Y saves.
- At scale −2 the rat is a size-matched opponent; at scale −1 Mara has the size advantage. The in-frame prompt shows when fight and bypass actions are available.
- Fight, bypass, rat fate, crisis time, and player progress survive save/export/import. Old schema-v1 runs load with the rat still present.
- The west wall remains damaged after reload when Mara grows through it.
- The focused Jest suite passes and exits with status 0.
- Build artifacts are written under `public/`; full check evidence is written under `.tmp/` and coverage reports under `reports/coverage/`.

## Troubleshooting Hooks

- Verbose mode command: `npm run check`.
- Log location: `.tmp/threefold-check.log` for an explicitly logged local run.
- Cleanup command: remove only the task-specific `.tmp/threefold-*` files after retaining needed evidence.
- If the canvas is blank, verify that `/threefold/game.js` and `/core/browser/game/threefold/page.js` were copied into `public/`.
