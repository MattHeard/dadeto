# Persist Symphony launch rejection reason (dadeto-uly7 runner loop)

- **Unexpected hurdle:** Log artifacts were already being produced for failed launches, but they contained only the event metadata, so the rejection reason could vanish once the TUI pulled fresh status updates.
- **Diagnosis path:** Stepped through `src/local/symphony/statusStore.js` and confirmed the per-run log only echoed `latestEvidence` and `lastOutcome` even when `lastLaunchAttempt.error` had the human-readable rejection text; the stored status was correct, so a lightweight log-field addition would give operators another durable artifact.
- **Chosen fix:** Extend the log payload to mirror `status.lastLaunchAttempt` and teach the symphony launch tests to read the new log file entries when the Ralph launcher rejects (ready guard, missing bead id, and integration error scenarios) so the rejection text appears in every relevant artifact.
- **Next-time guidance:** When the UI displays transient diagnostics, add a matching log assertion whenever you touch the persistence layers so the reason survives status refreshes; be prepared for `bd comments add` to rerun `npm test` via the hooks.
