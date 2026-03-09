## Context

`dadeto-8jek` fixed the next bounded typed-JS / tsdoc slice in `src/core/browser/inputHandlers/gamepadCapture.js`.

## What changed

- Narrowed the nullable payload case in `syncIfPayload` before calling `syncToyInput`.
- Kept the animation-frame cancel path local and explicit in `cancelPoll`.
- Added a local gamepad-presence type guard for the connected-gamepads list.
- Narrowed the connection event gamepad before storing the snapshot in `handleConnectionEvent`.

## Evidence

- `npm run tsdoc:check` no longer reports `src/core/browser/inputHandlers/gamepadCapture.js`.
- `npm test` passed with `473` suites and `2317` tests.

## Next-time guidance

The remaining tsdoc queue is now led by larger `joyConMapper.js` failures plus smaller presenter/toy/local surfaces. Prefer another file-local slice before widening into the full `joyConMapper.js` block unless a clearly bounded subcluster is shaped first.
