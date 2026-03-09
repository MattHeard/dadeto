# 2026-03-09: reconcile orphaned Symphony runs

- **Bead:** `dadeto-3tdj`
- **Context:** Symphony status stayed stuck at `state: "running"` when a detached Ralph run had already exited and the server either missed the exit event or restarted.

## Outcome

- `src/local/symphony/app.js` now rereads `tracking/symphony/status.json` before replying and, whenever an `activeRun` has a recorded `pid` that no longer exists in the OS, the handler marks the bead as `blocked`, drops `activeRun`, and writes the updated status with a log-linked summary via `applyRunnerOutcome`.
- Added Jest coverage so the status handler exercises the new reconciliation path and skips it when the `pid` is still alive.

## Evidence

- `npm test` passes (`473 suites, 2317 tests`), including the new `test/local/symphony.app.test.js` cases.
- Beads evidence records the stale `activeRun` scenario and the new `blocked` summary to help operators notice when the asynchronous reconciling happened.

## Next

- Watch for future runs where the PID exists but the handler still sees a missing log file; that would point at the launcher failing before writing `stdout`/`stderr`.
