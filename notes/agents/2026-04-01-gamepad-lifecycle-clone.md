## Gamepad lifecycle clone pass

- **Context:** `jscpd` kept flagging a self-clone in `src/core/browser/inputHandlers/gamepadCapture.js` around the lifecycle option objects used for release and toggle wiring.
- **Fix:** Extracted `createGamepadEmitPayloadOptions(options, emitPayload)` so both `createReleaseCaptureEmitCaptureStateOptions` and `createGamepadToggleOptions` reuse the same lifecycle bundle instead of rebuilding the same shape inline.
- **Follow-up:** Remaining `17`-token groups are now in `symphony`, `cloud-core`, and `commonCore`. Keep iterating one group at a time and land each slice separately.

**Testing**
1. `npm run duplication`
2. `npm run lint`
3. `npm test`
