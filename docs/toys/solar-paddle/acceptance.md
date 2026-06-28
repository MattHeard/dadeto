# Acceptance: Solar Paddle

## User-visible behavior
- The blog contains a public post for `Solar Paddle`.
- The post uses `SOLA1` and defaults to the `keyboard-capture` input method and `canvas-2d` output method.
- The toy persists game state in local storage between submits.
- Held left/right input moves the paddle while button presses for launch, pause, and reset only fire once per press.
- The toy renders an original solarpunk paddle scene using shapes, not text.

## Evidence
- `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-06-28/solarPaddle.test.js` passes.
- `npm run build` regenerates `public/blog.json` and `public/index.html` with the public post.
- `npm test` passes.

## Pass/Fail Rules
- Pass when the Solar Paddle test, the generator/build gates, and the repo test suite all pass.
- Fail when the toy does not persist state, the canvas payload is malformed, or edge-triggered actions repeat every frame.
