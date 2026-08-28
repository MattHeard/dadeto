# GCP test schedule guard

- Unexpected hurdle: live GitHub run history was unavailable because the GitHub API could not be reached from the sandbox.
- Diagnosis: `schedule_gate` requested the newest workflow run and could receive the currently executing scheduled run. Matching its SHA caused the run to skip itself.
- Fix: ignore `context.runId` before comparing the newest prior run SHA; add a regression test.
- Next-time guidance: verify a scheduled run's guard notice in GitHub Actions when network access is available.
