## GCP Test Report Download Fix

- Hurdle: the Playwright HTML artifact looked empty even though the Cloud Run logs showed a real test failure.
- Diagnosis: the Playwright container uploads the report to GCS, but the GitHub workflow was archiving the runner workspace instead of downloading that cloud-generated report back first.
- Fix: teach `.github/workflows/gcp-test.yml` to pull `playwright-report` and `test-results` from the GCS report root before `actions/upload-artifact`.
- Next time: if the report still looks wrong, inspect the downloaded `playwright-report/index.html` alongside the Cloud Run execution logs to see whether the issue is in report generation or in artifact collection.
