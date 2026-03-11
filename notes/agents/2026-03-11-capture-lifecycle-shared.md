# Capture Lifecycle Shared Helper

- Bead: `dadeto-k0bb`
- Date: `2026-03-11`

## Outcome
Shared the capture toggle/release lifecycle so that keyboardCapture and gamepadCapture now reuse one helper for updating the button label plus toy payload, which removes the tiny cross-handler clone the bead targeted.

## What changed
- Added `src/core/browser/inputHandlers/captureLifecycleShared.js` to encapsulate the capture-state emission (button label + hidden input payload).
- Pointed both `keyboardCapture.js` and `gamepadCapture.js` at that helper, wrapping `syncToyInput` where needed so the helper always calls `emitPayload(input, payload)`.
- Regenerated the built copies and recorded the loop evidence in this bead.

## Evidence
- `npm run duplication` (still reports other clones, but the capture-state payload lines that once crossed the handler boundary now live in the shared helper).
- `npm test` (475 suites, 2324 tests).

## Lesson
Unexpected hurdle: the helper initially called `emitPayload` with a single object, which made `syncToyPayload` receive `payload` as `undefined` and broke the keyboard handler. Diagnosis came from instrumenting helpers and replaying the handler, so the fix was to standardize `emitPayload(input, payload)` and wrap `syncToyInput`. Next time, normalize the helper's calling convention before wiring multiple callers so each handler still feeds the downstream signature it expects.
