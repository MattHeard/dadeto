## Context

`dadeto-c7df` re-read the duplication report after the recent helper-cleanup beads to choose the next exact duplication slice.

## Selection

The old toy/helper family around `joyConMapper`, `hiLoCardGame`, and `joyConMapping` is no longer the best next target. The remaining report is now led by the broader `gamepadCapture.js` ↔ `keyboardCapture.js` family plus a handful of small spillover overlaps.

The next smallest stable implementation slice is a capture-lifecycle subcluster inside the cross-input-handler family:

- `src/core/browser/inputHandlers/gamepadCapture.js:179-185`
- `src/core/browser/inputHandlers/keyboardCapture.js:176-182`

with a closely related companion overlap at:

- `src/core/browser/inputHandlers/gamepadCapture.js:663-668`
- `src/core/browser/inputHandlers/keyboardCapture.js:176-181`

## Why this target

- It is smaller and more coherent than the whole `gamepadCapture.js` ↔ `keyboardCapture.js` family.
- It is a real cross-file maintenance risk, unlike several of the remaining one-off `5` line generic guard overlaps.
- It keeps the next duplication bead bounded to one concept family instead of bouncing back to broad handler rewrites.

## Next-time guidance

Shape the next implementation bead around one shared capture-lifecycle helper or one tiny cross-file sync path inside `gamepadCapture.js` and `keyboardCapture.js`, not the whole handler setup surface.
