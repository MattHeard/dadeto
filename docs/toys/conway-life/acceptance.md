# Acceptance: Conway Life

## User-visible behavior
- The blog contains a public post for `Conway Life`.
- The post uses `CONW1` and defaults to the `canvas-2d` output method.
- The toy persists its board and tick speed in local storage.
- When auto-submit is enabled, the simulation advances one frame per browser poll cycle.
- The rendered output shows a live board as canvas shapes rather than plain text.

## Evidence
- `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-06-22/conwayLife.test.js test/browser/initializeInteractiveComponent.autoSubmit.test.js` passes.
- `npm run build` regenerates `public/blog.json` and `public/index.html` with the public post and `canvas-2d` output option.
- `npm test` passes.

## Pass/Fail Rules
- Pass when the Life toy test, the auto-submit behavior test, and the generator/build gates pass.
- Fail when the toy does not persist state, the canvas payload is malformed, or the auto-submit loop does not drive frame-by-frame stepping.
