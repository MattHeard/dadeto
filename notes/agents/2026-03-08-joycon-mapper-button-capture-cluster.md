# 2026-03-08: joyConMapper button capture helper cluster

- Bead: `dadeto-46hw`
- Scope: reduce the small button-capture helper complexity cluster in `src/core/browser/inputHandlers/joyConMapper.js` without widening into the axis or handler backlog.
- Change:
  - moved the button-snapshot null guard behind `isMissingButtonSnapshots()`
  - extracted the reducer construction to `makeButtonCaptureReducer(previous)` so `detectButtonCapture()` only delegates
  - routed the final winner selection through `pickStrongerButtonCapture()` so `selectStrongerButtonCapture()` only handles the empty-best case
- Validation:
  - `npm run lint` no longer reports complexity warnings for `detectButtonCapture` or `selectStrongerButtonCapture` in `reports/lint/lint.txt`
  - `npm test` passed with `467` suites and `2302` tests
- Follow-up:
  - the next nearby warning in this area is the reducer arrow helper; axis-capture warnings remain for later bounded beads
