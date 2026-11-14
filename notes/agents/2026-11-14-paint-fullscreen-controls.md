# Paint full-screen drawing area and collapsible Controls

The mobile screenshot showed a large unused area below the drawing: full-screen
mode expanded the panel, but the canvas retained its embedded aspect-ratio height
and viewport cap. Full-screen mode now uses a two-row grid: an auto-sized Controls
panel and a canvas filling the remaining row. The canvas's CSS height and maximum
height are overridden only while expanded and restored when leaving. Intrinsic
1200 × 800 dimensions and drawing pixels stay untouched; pointer scaling already
uses the displayed bounds.

All paint tools and configuration are grouped in a native, initially open
`details` panel with a keyboard/touch-operable Controls summary. Collapsing it
reclaims height for the canvas automatically, including after orientation changes.
The summary remains accessible while collapsed. Existing Auto-update lifecycle
preservation keeps the expanded/collapsed state and canvas mounted.

Focused evidence: `node scripts/run-jest.js --runInBand test/core/browser/presenters/paint.test.js test/browser/toys.paint.autoSubmit.test.js test/scripts/playwright-cloud-config.test.js`:
3 suites / 5 tests passed. Changed-file ESLint passed with no warnings.

A browser geometry regression was added to the cloud E2E suite in
`test/e2e/paint-layout.spec.ts`: portrait and landscape edge measurements,
canvas growth after collapse, native Controls reopening, and unchanged bitmap
across layout changes. It runs in CI/cloud per repository policy; local jsdom
cannot verify rendered geometry. Do not claim that browser test has passed
until the cloud workflow reports it.

`bd` remains unavailable in this workspace. Next time, use the available-height
layout for the canvas itself rather than only expanding its surrounding panel.

Final validation: `npm run check` exited 0: all six batches, 1,124 unit suites /
11,321 tests, and all 11 static gates passed. `npm run build` passed.
`npx playwright test --config=test/e2e/cloud.config.ts --list paint-layout`
verified discovery of the new cloud geometry test without executing a local
browser. Its actual browser result remains pending CI/cloud execution.
