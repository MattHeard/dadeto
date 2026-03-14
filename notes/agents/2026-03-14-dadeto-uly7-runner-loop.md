# Persist Symphony launch rejection reason (dadeto-uly7 runner loop)

- **Unexpected hurdle:** The per-run Symphony logs were only mirroring `latestEvidence` and `lastOutcome`, so rejection text disappeared as soon as the TUI refreshed the status even though `status.lastLaunchAttempt.error` held the explanation.
- **Diagnosis path:** Checked `src/local/symphony/statusStore.js` and confirmed the log payload never serialized `lastLaunchAttempt` despite the value being present in persisted status; the value was therefore never captured in `tracking/symphony/runs/*--launch-failed.log` when the launcher guard blocked or errored.
- **Chosen fix:** Mirror `status.lastLaunchAttempt` in every log entry and extend the launch tests to parse the JSON log artifact for the guard-failure, missing-bead, and integration-error scenarios so the rejection reason surfaces in the durable artifact.
- **Next-time guidance:** When the UI displays transient diagnostics, pair every persistence change with a log assertion so a future engine refresh still surfaces the same explanation for operators; keep the runner-loop tests aligned with each new log field addition.
- **Evidence:** `npm test`
