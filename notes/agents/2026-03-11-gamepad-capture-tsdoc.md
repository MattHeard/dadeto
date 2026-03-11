# 2026-03-11 Gamepad capture tsdoc boundary

- **Unexpected hurdle:** `npm run tsdoc:check` was still failing because `emitCaptureState` expected a single `emitPayload` parameter but our shared lifecycle helpers and `releaseCapture` were using two arguments without matching JSDoc, leaving `options` and `input/payload` implicitly `any`.
- **Diagnosis path:** looked at the tsdoc output around the gamepad cluster, traced the errors to the shared lifecycle typedefs in `captureLifecycleShared.js` / `captureLifecycleToggle.js` and the `releaseCapture` helper in `gamepadCapture.js`.
- **Fix:** aligned the lifecycle typedefs with `(input, payload)` signatures, documented `releaseCapture` with `HandlerOptions`, and destructed the emit payload call so `syncToyInput` receives the exact input/payload object; reran `npm run tsdoc:check` to ensure no new gamepad errors surfaced.
- **Next-time guidance:** after cutting this cluster, jog the bead list to the next tsdoc cluster (current joyConMapper/ledger failures) before widening the handler scope again.
