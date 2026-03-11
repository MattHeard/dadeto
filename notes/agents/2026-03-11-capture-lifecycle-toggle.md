# Capture Lifecycle Toggle Helper

- Bead: `dadeto-ko2r`
- Date: `2026-03-11`

## Outcome
Created a single toggle helper the keyboard and gamepad handlers share so the capture button, emit state, and start/stop hooks no longer live in duplicated blocks.

## What changed
- Introduced `captureLifecycleToggle.js` to expose `createCaptureLifecycleToggleHandler` which emits capture state and runs optional start/stop callbacks.
- Wired the keyboard handler into the helper with the right `updateButtonLabel`/`emitPayload`, and taught the gamepad handler to reuse it with its poll start/stop behavior.
- Added `stopCaptureSideEffects` so both manual toggles and escape releases share the same cleanup path.

## Evidence
- `npm test` (475 suites, 2324 tests)

## Lesson
Unexpected hurdle: the initial helper call in the keyboard form left out `updateButtonLabel`, so the emitted state threw in tests. Diagnosis came from the exact failing suite, which pointed to `emitCaptureState` being fed undefined callbacks. Fixing the helper invocation and double-checking required parameters prevented the helper from being used incorrectly; next time validate the helper option shape before wiring multiple callers.
