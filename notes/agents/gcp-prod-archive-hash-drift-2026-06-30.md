Unexpected hurdle: `gcp-prod` kept failing in Terraform plan even though no e2e step runs in that workflow.

Diagnosis path: inspected the failed Actions job, confirmed the failure was in `Terraform Plan`, and traced the repeated replacements to Cloud Function source archives. The copy step was recreating files with fresh mtimes on each workflow run, which made `archive_file` hashes drift.

Chosen fix: normalize copied file mtimes to a fixed timestamp in the build copy helper so the generated Terraform archives are stable across runs.

Next-time guidance: when a Terraform plan shows wholesale replacement of `google_storage_bucket_object` archives without source changes, check copied-file metadata before touching workflow logic or test coverage.
