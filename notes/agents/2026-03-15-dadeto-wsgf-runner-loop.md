# dadeto-wsgf runner loop

- unexpected hurdle: The `registerGlobalListener` helper asserted `EventListenerOrEventListenerObject`, so my well-typed gamepad/keyboard handler signatures were rejected even though the runtime wiring was sound.
- diagnosis path: `npm run tsdoc:check` still failed after the prior typed guard slide, so I inspected the first new error and traced it back to the listener helper signature mismatch at `src/core/browser/inputHandlers/captureFormShared.js`.
- chosen fix: Gave `registerGlobalListener` a generic handler parameter and cast it to `EventListener` internally before wiring the global listeners, so the narrower `KeyboardEvent` and unioned `GamepadEvent | { gamepad?: Gamepad }` callbacks now flow through cleanly without rewiring the callers.
- next-time guidance: When TSDoc flags an `EventListenerOrEventListenerObject` mismatch, try introducing a tiny generic wrapper that casts to `EventListener` rather than widening every handler; rerun `npm run tsdoc:check` immediately to capture the next outstanding failure (right now the next mismatch lands in `joyConMapper.js:87`).
