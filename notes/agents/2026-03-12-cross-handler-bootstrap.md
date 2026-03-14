## Context
The next duplication slice after the emitted-toy-payload cleanup lived in both `keyboardCaptureHandler` and `gamepadCaptureHandler`, where the two handlers repeated the same hide/disable + `applyBaseCleanupHandlers` sequence before mounting their mode-specific forms.

## Unexpected hurdle
The capture handlers already share most of their wiring through `captureFormShared.js`, so there was no obvious helper to pull this small sequence into until I realized the repeated DOM-wiring block itself could be the shared helper.

## Diagnosis path
`npm run duplication` reported the same 6-line block (`browserCore.hideAndDisable` + `applyBaseCleanupHandlers` + `build*CaptureForm`) between `src/core/browser/inputHandlers/keyboardCapture.js` lines 219-226 and `gamepadCapture.js` lines 833-840, showing that duplication detection still pointed at the handler entries rather than the shared builder callbacks.

## Chosen fix
Added `prepareCaptureHandler` to `captureFormShared.js` so the shared block now lives in one helper. Both handlers now call `prepareCaptureHandler({ dom, container, textInput })` before invoking their form builder, which removes the 5-8 line overlap that triggered the report.

## Next-time guidance
When a handler duplication cluster is limited to a brief bootstrap handshake, pull that handshake into a tiny shared helper and keep the handler body focused on the mode-specific listeners before running `npm run duplication` again.
