# Failure Modes: Canvas Doodle

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
  - The toy is added but the output dropdown does not include `canvas-2d`.
- Invalid or missing inputs:
  - Blank JSON or malformed JSON should fall back to a default doodle.
- Dependency/service unavailable:
  - The browser does not expose a canvas 2D context.
- Non-deterministic timing or ordering:
  - The toy uses randomness to vary colors, so snapshot-style tests should avoid depending on exact hues.
- Environment-specific behavior:
  - Canvas rendering may differ if the browser or test DOM lacks `getContext`.

## Detection Signals
- Error signatures/log lines:
  - Missing `canvas-2d` option in generated HTML.
  - `getContext` returns `null`.
  - `Cannot read properties of undefined` when the presenter assumes a shape field exists.
- Observable symptoms:
  - The output area still shows text instead of a canvas.
  - The canvas renders but remains blank because the drawing commands did not run.
- Failing command(s):
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/browser/presenters/canvasDoodle.test.js test/toys/2026-06-12/canvasDoodle.test.js`

## First-Response Playbook
1. Confirm the blog post is beta-released and the output key is present in the dropdown.
2. Check whether the parsed payload fell back to defaults or was accepted as JSON.
3. Verify the canvas context exists in the test DOM and that the drawing commands were invoked.

## Promoted from Real Failures
- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
