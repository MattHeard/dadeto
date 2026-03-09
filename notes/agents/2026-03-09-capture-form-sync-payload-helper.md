# Capture Form Sync Payload Helper

- Bead: `dadeto-d07f`
- Date: `2026-03-09`

## Outcome

Removed the small `gamepadCapture.js` to `keyboardCapture.js` duplication cluster built around repeated `syncToyInput({ ..., payload })` calls by adding a narrower shared helper in `captureFormShared.js`.

## What changed

- Added `syncToyPayload(input, payload)` to `src/core/browser/inputHandlers/captureFormShared.js`.
- Updated `src/core/browser/inputHandlers/keyboardCapture.js` to use that helper for its capture toggle, escape release, and forwarded key payload writes.

## Evidence

- `npm run duplication` no longer reports the owned cross-file clone pairs around:
  - `gamepadCapture.js [161:1 - 166:8]` ↔ `keyboardCapture.js [176:2 - 181:2]`
  - `gamepadCapture.js [184:2 - 190:10]` ↔ `keyboardCapture.js [176:2 - 182:6]`
  - `gamepadCapture.js [681:2 - 686:2]` ↔ `keyboardCapture.js [176:2 - 181:2]`
- The nearby remaining duplicate in that area is now internal to `gamepadCapture.js`, so it is outside this bead's cross-file ownership.
- `npm test` passed (`473` suites, `2317` tests).

## Lesson

When two handlers only share the final payload-write shape, the right extraction point is the payload write itself, not a broader lifecycle helper.
