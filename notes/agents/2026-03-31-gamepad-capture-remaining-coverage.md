# Gamepad Capture Remaining Coverage Checklist

Dead branches removed from `src/core/browser/inputHandlers/gamepadCapture.js`:

- `emitToyPayload` null payload guard
- `removeSnapshot(null)` guard
- `handleConnectionEvent` post-payload null guard

Remaining uncovered branches to target:

- [ ] `didButtonChange` first-sample path when `previousButton === undefined`
- [ ] `getPreviousButtons` fallback to `[]` when `previousSnapshot` is `undefined`
- [ ] `didTrackedAxisChange` first-sample path when `previousAxis === undefined`
- [ ] `getPreviousAxes` fallback to `[]` when `previousSnapshot` is `undefined`
- [ ] Cleanup callback that runs `cancelPoll` and `resetSnapshots`
- [ ] Cleanup callback that removes the button click listener
