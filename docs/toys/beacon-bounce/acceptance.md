# Acceptance: Beacon Bounce

## User-visible behavior
- The blog contains a public post for `Beacon Bounce`.
- The post uses `BEAC1` and defaults to the `mobile-controls` input method and `canvas-2d` output method.
- The toy persists game state in local storage between submits.
- Held left/right input moves the paddle while button presses for launch, pause, and reset only fire once per press.
- The mobile controls render button elements for left, right, launch, pause, and reset, and they respond to tap and hold interaction.
- The toy renders an original beacon-network scene using shapes, not text alone.

## Evidence
- `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-07-01/beaconBounce.test.js` passes.
- `npm run build` regenerates `public/blog.json` and `public/index.html` with the public post.
- `npm test` passes.

## Pass/Fail Rules
- Pass when the Beacon Bounce test, the generator/build gates, and the repo test suite all pass.
- Fail when the toy does not persist state, the canvas payload is malformed, or edge-triggered actions repeat every frame.
