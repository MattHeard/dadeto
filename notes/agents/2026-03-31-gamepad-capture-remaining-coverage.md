# Gamepad Capture Remaining Coverage Checklist

Dead branches removed from `src/core/browser/inputHandlers/gamepadCapture.js`:

- `emitToyPayload` null payload guard
- `removeSnapshot(null)` guard
- `handleConnectionEvent` post-payload null guard

Remaining uncovered branches to target:

- [ ] `cancelPoll()` early return when `state.animationFrameId` is not an integer

Likely dead uncovered branches under the current `dom.getGamepads()` contract:

- `getConnectedGamepads()` fallback when `readGamepads === null`
- `toConnectedGamepads(gamepads ?? [])` nullish fallback
