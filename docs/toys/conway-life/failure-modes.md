# Failure Modes: Conway Life

## Initial Predicted Failure Classes
- Persistence mismatch:
  - The toy writes state under the wrong local-storage key or fails to reload it.
- Simulation logic error:
  - The next generation rules are wrong or edge cells are not handled consistently.
- Auto-submit mismatch:
  - The browser loop only reacts to input edits instead of stepping every frame while enabled.
- Renderer mismatch:
  - The toy emits JSON that the canvas presenter cannot render.

## Detection Signals
- Error signatures/log lines:
  - Missing `canvas-2d` option in generated HTML.
  - The stored `CONW1` payload never changes between frames.
  - The board stalls when auto-submit is enabled.
- Observable symptoms:
  - The output area stays static.
  - The state resets on refresh.
  - Live cells render outside the canvas bounds.
- Failing command(s):
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-06-22/conwayLife.test.js test/browser/initializeInteractiveComponent.autoSubmit.test.js`

## First-Response Playbook
1. Confirm the public post exists and the default output method is `canvas-2d`.
2. Check the stored `CONW1` object in local storage and compare it to the rendered payload.
3. Verify the auto-submit loop is actually calling submit on each animation frame.

## Promoted from Real Failures
- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
