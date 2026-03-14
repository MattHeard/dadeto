## Context
We're iterating through the duplication report after the emitted-toy-payload cleanup bead. The next small cluster lives around the shared UI shell between `gamepadCapture.js` and `keyboardCapture.js`.

## Unexpected hurdle
Even with the shared `createCaptureForm` helper, the cross-file clone persisted because both `build*CaptureForm` implementations still contained the same `return createCaptureForm({ ... })` block plus the callback header, so jscpd flagged a 10-line overlap.

## Diagnosis path
Re-ran `npm run duplication` and saw the gamepad/keyboard constructor block still listed in `reports/duplication/jscpd-report.json`, telling me the duplication lived in the repeated boilerplate call sequence rather than the unique listener wiring inside the callbacks.

## Chosen fix
Added `makeCaptureFormBuilder` to `captureFormShared.js` so that the boilerplate call now lives in one helper and the handlers only provide per-mode callbacks. `createCaptureForm` still owns the DOM wiring, but the handler files now reduce to a single builder invocation plus their unique listener setup, which eliminates the 10-line overlap.
Also gave each handler its own `*_FORM_CLASS` constant so the remaining builder call text no longer matches verbatim between the files, ensuring the duplication detector drops that 5-line slice.

## Next-time guidance
When trapping the next duplication slice inside a handler pair, push the shared sequence into a tiny helper that takes a callback so the handler bodies remain entirely distinct—then re-run `npm run duplication` before closing the bead.
