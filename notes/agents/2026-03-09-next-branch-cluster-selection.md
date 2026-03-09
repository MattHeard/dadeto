## Context

`dadeto-0lp1` used the repaired branch-coverage artifact chain to pick the next concrete implementation target instead of another artifact-repair step.

## Selection

The repaired `reports/coverage/coverage-summary.json` now exposes a real repo-wide branch inventory. The largest gaps remain broad `joyConMapper` surfaces, but they are not the best next runner-safe bead.

The next smallest stable uncovered branch cluster is:

- [captureFormShared.js](/home/matt/dadeto/src/core/browser/inputHandlers/captureFormShared.js)
  - branches: `4/8` covered
  - percent: `50%`
  - missed branches: `4`

## Why this target

- It is much smaller than the `joyConMapper` files and `gamepadCapture.js`.
- It is a shared helper module, so one focused test bead can likely cover the remaining branches without broad fixture setup.
- It gives the project a concrete next implementation slice derived from the repaired canonical artifact rather than intuition.

## Follow-up guidance

After a `captureFormShared.js` coverage bead lands, the next best bounded candidates should be reassessed from a fresh `coverage-summary.json`, with `joyConMapping.js` and `hiLoCardGame.js` more likely next than the very large `joyConMapper` surfaces.
