# 2026-03-08: joyConMapper helper complexity cluster

- Bead: `dadeto-a1pk`
- Scope: reduce the early helper-level complexity warnings for `currentPad`, `createElement`, and `describeCapture` in `src/core/browser/inputHandlers/joyConMapper.js` without widening into broader mapper refactors.
- Change:
  - moved gamepad enumeration behind `readConnectedGamepads()` so `currentPad()` only selects the first connected pad
  - routed element option handling through `applyCreatedElementOptions()` with a shared empty-options constant so `createElement()` remains a straight constructor helper
  - split mapped capture formatting into `describeMappedCapture()` so `describeCapture()` only handles the null case
- Validation:
  - `npm run lint` no longer reports complexity warnings for `currentPad`, `createElement`, or `describeCapture` in `reports/lint/lint.txt`
  - `npm test` passed with `467` suites and `2302` tests
- Follow-up:
  - remaining `joyConMapper` warnings are in the deeper capture and stored-state helpers; those should stay in later bounded beads
