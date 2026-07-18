# Generate-stats scheduler lifecycle

- Unexpected hurdle: live Cloud Logging showed deleted `t-*` functions still receiving daily Scheduler requests, while the Terraform resource was unconditional.
- Diagnosis: Cloud Scheduler jobs outlived ephemeral test environments; source had no environment guard.
- Fix: gate `google_cloud_scheduler_job.generate_stats_daily` on `var.environment == "prod"` and add a regression test for the contract.
- Next-time guidance: after this change lands, run the test workflow once and confirm Terraform destroys any pre-existing `t-*` scheduler jobs; the active local service account cannot list or delete those jobs directly.
