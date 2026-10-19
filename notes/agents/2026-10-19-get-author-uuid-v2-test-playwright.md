# get-author-uuid-v2 temporary Playwright verification

## Unexpected hurdle

The Rank 1 scope changed from a production smoke workflow to browser coverage in the existing `gcp-test` job. Old Bead and Notion notes still described production Workload Identity Federation as a blocker. The first `npm run check` also exposed a moderate audit finding in `google-auth-library` 9.15.1's `gaxios`/`uuid` dependency chain. A restricted rerun could not spawn child Node processes (`EPERM`) or reach the audit registry.

## Diagnosis and fix

Use the disposable `t-*` Cloud Run Playwright identity and database. Terraform passes the temporary function URL and Identity Platform tenant name into the job, sets the same temporary browser origin on the function, and grants `roles/iam.serviceAccountTokenCreator` only on the disposable runner service account to itself. The test signs a five-minute tenant custom token through IAM Credentials, exchanges it for an ID token in memory, and issues browser fetches from the configured temporary origin. The Authorization header causes the browser to perform the CORS preflight. The successful requests may create only `authors/{uid}` in the temporary `t-*` database.

Upgrade the test-only `google-auth-library` dependency to 10.9.1 (Node >=18) so the transport uses `gaxios` 7.3.1 and the audit is clean. Remove the production smoke workflow, its metadata handoff, standalone smoke scripts/tests, and obsolete production WIF setup instructions.

## Evidence

- Focused workflow/auth/deployment regressions passed: 4 suites, 14 tests.
- Cloud Playwright discovery passed and listed the new spec among 12 tests; no GCP Playwright request was executed.
- `terraform fmt -check -diff -recursive` passed.
- `DADETO_JEST_POOL_DIR=/tmp/codex-dadeto-rank1-pool DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 local gates: 954 suites, 6,507 tests, zero clones, zero audit vulnerabilities.
- `terraform init -backend=false && terraform validate` was blocked because the machine wrapper prohibits local Terraform init. Let the repository Terraform validation workflow provide that evidence.
- No production request was made. The temporary GCP Playwright test and its possible author write remain unverified until the existing `gcp-test` run executes.

## Next-time guidance

Reconcile the Bead and the Notion Rank 1 page when acceptance changes; explicitly mark prior production-smoke status sections as superseded. Do not manually dispatch `gcp-test` from a feature branch because its successful run can start the existing `gcp-prod` chain. Validate the branch through GitHub checks, then record the next normal `gcp-test` run and keep the Bead open until the browser assertions execute against the disposable environment.
