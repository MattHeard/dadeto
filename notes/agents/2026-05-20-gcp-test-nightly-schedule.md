# gcp-test nightly schedule

- Unexpected hurdle: the existing `gcp-test` workflow had only manual dispatch, so there was no automatic daily signal for whether the cloud stack still works.
- Diagnosis path: I added a schedule trigger and made the scheduled path compare the latest `gcp-test` run SHA on the default branch against the current SHA. That lets the workflow skip the expensive cloud execution when nothing changed since the previous run.
- Chosen fix: `gcp-test.yml` now includes a midnight UTC cron and a tiny `schedule_gate` job that sets `should_run=false` when the latest run already covered the current commit.
- Next-time guidance: if we want a different “midnight” timezone, adjust the cron accordingly. GitHub Actions cron is UTC, so the current schedule is midnight UTC by design.
