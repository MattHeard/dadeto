## Context

`dadeto-qmh8` targeted one small clone cluster shared between `src/core/browser/inputHandlers/gamepadCapture.js` and `src/core/browser/inputHandlers/keyboardCapture.js`.

## What changed

I extracted the shared capture-form plumbing into `src/core/browser/inputHandlers/captureFormShared.js`. The shared module now owns payload serialization, auto-submit wiring, hidden-input syncing, and article-level auto-submit checkbox lookup.

## Why this slice

The strongest small cross-file duplication was in the setup path, not the capture-specific event logic. Pulling only that shared plumbing into one local helper removed the earlier setup and form-construction clone entries without forcing the two handlers into a broader abstraction.

## Evidence

- `npm run duplication` no longer reports the earlier representative setup/form clones for this family.
- Remaining `gamepadCapture.js` ↔ `keyboardCapture.js` duplicates are later event/listener slices and can be shaped as follow-up beads.
- `npm test` passed after the extraction.
