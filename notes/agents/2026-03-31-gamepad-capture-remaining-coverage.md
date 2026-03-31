# Gamepad Capture Remaining Coverage Checklist

Dead branches removed from `src/core/browser/inputHandlers/gamepadCapture.js`:

- `emitToyPayload` null payload guard
- `removeSnapshot(null)` guard
- `handleConnectionEvent` post-payload null guard

Remaining uncovered branches to target:

- [ ] Cleanup callback that runs `cancelPoll` and `resetSnapshots`
- [ ] Cleanup callback that removes the button click listener
