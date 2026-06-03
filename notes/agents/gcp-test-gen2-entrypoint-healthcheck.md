## GCP Test Gen2 Entrypoint Healthcheck

- Unexpected hurdle: after the Gen1 Terraform entrypoints were fixed, the next
  GCP test failed while creating the Gen2 `get-api-key-credit-v2` function.
- Diagnosis path: the failed GitHub Actions log pointed at the Cloud Run
  revision healthcheck for `google_cloudfunctions2_function.get_api_key_credit_v2`.
  Local cloud packaging and a generated-package import confirmed that the bundle
  exported `handle`, so the likely weak spot was the Firebase Functions v2
  wrapper layer during Gen2 startup rather than a missing source export.
- Chosen fix: export a plain async HTTP `handle(req, res)` for the Gen2
  function and remove the `firebase-functions/v2/https` wrapper import from the
  startup path.
- Next-time guidance: for Terraform-managed Gen2 HTTP functions, prefer plain
  Functions Framework-compatible handlers unless a Firebase-specific wrapper is
  required. Add a small source-level guard when changing entrypoint shape so CI
  catches wrapper regressions before Cloud Run healthchecks do.
