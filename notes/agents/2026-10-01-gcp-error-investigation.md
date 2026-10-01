# GCP error investigation — 2026-10-01

Read-only diagnosis of project `irien-465710`, approximately 15:21 UTC.
No application fixes or database deletions were performed. Follow-up bugs remain open.

## Findings and evidence

- `dadeto-2lt4`: 23 production browser recursion reports in the preceding 24 hours. `src/core/browser/main.js` passes `dom.logError` into the beacon handler, then replaces `console.error`; `src/core/browser/document.js` dynamically calls that replaced method. The actual modules reproduce `RangeError: Maximum call stack size exceeded` with reporting stubbed and the original console restored afterward. Preserve the original bound console sink and test real facade wiring and repeated initialization when fixing this.
- `dadeto-6epo`: live Firestore listing contains 100 databases, including 98 named `t-*`. Logs contain 109 quota failures creating `t-54835e09`, followed by 14 dependent function deployment failures. Review ownership and exact stale test targets before cleanup; preserve production and default databases. The dependent missing-database errors are not evidence that a new default database should be created.
- `dadeto-kp6m`: daily production stats scheduler failed HTTP 401 at 00:00 UTC. Function execution logs explicitly record `Admin auth rejected: missing token`. Repository Terraform defines only the `X-Appengine-Cron` header for this request. Reading deployed scheduler configuration was denied (`cloudscheduler.jobs.get`), so the precise deployed authentication mismatch remains unverified.
- Two `prod-errors` CORS rejections do not identify the rejected origins in these logs. Do not broaden the allowlist without caller evidence. Two scheduler deletion `Job not found` errors also occurred; these appear consistent with cleanup noise, but were not independently traced.

## Diagnostic commands and artifacts

- `gcloud logging read 'severity>=ERROR' --project=irien-465710 --freshness=24h --limit=200 --order=desc --format=json`: succeeded, 151 entries; `/tmp/dadeto-gcp-errors-24h.json`.
- `gcloud firestore databases list --project=irien-465710 --format='json(name,type)'`: succeeded; `/tmp/dadeto-gcp-databases.json`.
- `gcloud logging read 'resource.labels.function_name="prod-generate-stats" AND timestamp>="2026-10-01T00:00:00Z" AND timestamp<="2026-10-01T00:02:00Z"' --project=irien-465710 --limit=30 --format=json`: succeeded; `/tmp/dadeto-gcp-stats-execution.json`.
- Scheduler describe: permission denied; do not treat repository configuration as verified deployed configuration.
- Local Node reproduction importing `createErrorBeaconHandlers` and `document.logError`: confirmed recursion, without network reporting or source edits.

Temporary JSON files are local diagnostic artifacts, not durable repository assets. This note and the linked beads retain the findings. No quality gates were rerun because this investigation changes documentation only and closes no implementation bead.

## Retrospective

The headline browser errors masked their original trigger because the reporting wrapper itself recursed. Comparing live stack frames with the real injected logger exposed the cycle; isolated module reproduction confirmed it. Next time inspect wrapper/facade interactions before investigating the underlying browser action, and distinguish primary quota failures from dependent deployment noise.
