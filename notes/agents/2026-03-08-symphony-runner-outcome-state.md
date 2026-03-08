# 2026-03-08: consume one Symphony runner outcome

- Bead: `dadeto-j18m`
- Scope: let the local Symphony scheduler consume one runner outcome and expose the next scheduler-visible state for `completed` and `blocked` cases.
- Change:
  - added `applyRunnerOutcome(...)` to `src/core/local/symphony.js`
  - completed outcomes now clear the active bead, move the scheduler to `idle`, and recommend refreshing the queue
  - blocked outcomes now move the scheduler to `blocked`, preserve blocker context, and recommend resolving the blocker before another runner loop
  - added coverage in `test/core/local/symphony.test.js` and `test/local/symphony.test.js`
- Validation:
  - `npm test` passed with `468` suites and `2306` tests
- Follow-up:
  - later runner-launch work can call this helper after one real loop completes instead of recomputing status transitions inline
