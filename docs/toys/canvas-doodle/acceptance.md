# Acceptance: Canvas Doodle

## User-visible behavior
- The blog contains a beta post for `Canvas Doodle`.
- The post uses `CANV1` and defaults to the `canvas-2d` output method.
- The toy returns JSON that the Canvas presenter can render into a visible `<canvas>`.
- The rendered output includes layered shapes rather than plain text only.

## Evidence
- `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/browser/presenters/canvasDoodle.test.js test/toys/2026-06-12/canvasDoodle.test.js test/browser/toys.setTextContent.canvasDoodle.test.js test/generator/toyOutputDropdown.test.js test/generator/toyUISections.test.js` passes.
- `npm run build` regenerates `public/blog.json` and `public/index.html` with the beta post and `canvas-2d` output option.
- `npm test` passes.

## Pass/Fail Rules
- Pass when the Canvas presenter test, toy test, and generator tests all pass and the generated blog data includes the beta post.
- Fail when the output method is missing, the presenter does not create a canvas element, or the post is not beta-gated.
