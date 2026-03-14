# 2026-03-13: Improve Symphony launch-state visibility
- **Unexpected hurdle:** Launch guard rejections threw before we ever recorded a failure, so the status log and TUI stayed silent about “not ready” refusals.
- **Diagnosis path:** Read `src/local/symphony/launch.js` and `src/core/local/symphony.js` to understand how `lastLaunchAttempt` and `latestEvidence` are built, then followed the guard path to see it skipped the existing failure persistence.
- **Chosen fix:** Persisted a failure status from the guard by reusing `applyRunnerLaunchFailure`, added a shared `persistLaunchFailure` helper, and extended the `launch` unit test to prove the rejected launch writes the error before bubbling the HTTP 500.
- **Next-time guidance:** When improving Symphony visibility ensure every guard/error path writes into `status.json` so the TUI and archived logs have durable “why it was blocked” text before the handler surfaces the HTTP error.
