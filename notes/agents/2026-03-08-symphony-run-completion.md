# 2026-03-08: reconcile finished Ralph runs in Symphony

- **Unexpected hurdle:** Symphony already recorded the launched run in `status.json`, but there was no way for the server to notice when the detached Ralph child exited, so the operator face still showed `state: "running"`.
- **Diagnosis path:** I revisited the `launchSelectedRunnerLoop` and `statusStore` wiring, verified the existing `applyRunnerOutcome` helpers, and traced how `tracking/symphony/runs/` logs are generated.
- **Chosen fix:** The Codex launcher now accepts an `onExit` hook, `launchSelectedRunnerLoop` installs a completion handler that reads the persisted status, runs `applyRunnerOutcome`, and writes the reconciled state, and the handler is covered by a dedicated Jest fixture.
- **Next-time guidance:** When a detached worker needs to drive scheduler state, keep the completion logic within the launch flow (hooking the child process exit) so the status file stays self-explanatory without extra polling or manual status edits.
