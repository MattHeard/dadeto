# Capture Form Shared Squash

The current `captureFormShared.js` survivors were addressed with a mix of boundary assertions and structural coverage.

What changed:
- `dispatchCheckboxChange()` now has an explicit assertion for the dispatched `change` event
- `buildCaptureForm()` now has a direct assertion for the created button and shell wiring
- `makeCaptureFormBuilder()` now has an end-to-end builder assertion that checks the returned form and `onFormReady` callback

Validation:
- full test suite passed after the test updates

Status:
- applied
- verified by the full test suite
