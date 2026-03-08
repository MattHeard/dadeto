# 2026-03-08: joyConMapper axis helper cluster

- Bead: `dadeto-mjpv`
- Scope: reduce the next axis-helper complexity cluster in `src/core/browser/inputHandlers/joyConMapper.js` without widening into the broader capture or handler backlog.
- Change:
  - moved the snapshot-presence guard behind `hasAxisSnapshots()` so `detectAxisCapture()` only gates and delegates
  - extracted the axis scan into `findStrongestAxisCapture()` and reused `mergeAxisCaptureCandidate()` to keep the reducer branch-free
  - replaced the nested winner-selection checks in `selectStrongerAxisCapture()` with a two-item magnitude sort so the helper stays below the lint threshold
- Validation:
  - `npm run lint` no longer reports complexity warnings for `detectAxisCapture` or `selectStrongerAxisCapture` in `reports/lint/lint.txt`
  - `npm test` passed with `468` suites and `2306` tests
- Follow-up:
  - the nearby `getAxisCaptureCandidate()` warning still remains for a later bounded bead
  - the remaining `joyConMapper` warnings are later payload, row-state, refresh, and handler helpers
