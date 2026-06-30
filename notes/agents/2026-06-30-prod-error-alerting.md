## Production Error Alerting

- Unexpected hurdle: the first alert draft targeted generic error logs, which was too broad for the Error Reporting incidents shown in the screenshots.
- Diagnosis path: inspected the Terraform provider shape, reviewed the prod workflow secret wiring, then compared the incident screenshots against Cloud Function and Cloud Run runtime labels.
- Chosen fix: use a native Cloud Monitoring log-match alert policy for `prod-*` Cloud Functions and Cloud Run revisions, send notifications to an email channel sourced from `PRODUCTION_ALERT_EMAIL`, and grant the Terraform service account the Monitoring and Logging roles needed to create the channel and policy.
- Next-time guidance: when the user shows an Error Reporting screenshot, start from the deployed runtime labels (`cloud_function` versus `cloud_run_revision`) and the prod name prefix before widening the filter any further.
