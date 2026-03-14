# dadeto-kwl3 runner loop

- unexpected hurdle: Coverage still flagged the `syncIfPayload` guard because the poll callback always emitted something before now, so proving the null branch required running the queued animation frame with a perfectly unchanged snapshot.
- diagnosis path: Inspected `reports/coverage/coverage-summary.json` and the branch map for `src/core/browser/inputHandlers/gamepadCapture.js`, found line 163 still had zero hits, and traced it to `pollGamepads` calling `syncIfPayload` with a null payload when no buttons/axes move.
- chosen fix: Added a Jest case that starts capture, fires a connect event, runs the first scheduled poll with the same gamepad values, and asserts the stored toy payload doesn’t change; reran `npm test -- test/browser/inputHandlers/gamepadCaptureHandler.test.js -- --runInBand` (which refreshed the coverage summary artifact).
- next-time guidance: When coverage highlights polls or animation-frame helpers, queue the callback before dispatching the event you want and then run it manually with unchanged input so the null path executes without needing UI interaction.
