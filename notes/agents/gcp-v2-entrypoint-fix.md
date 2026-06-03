# GCP v2 Entrypoint Fix

Unexpected hurdle: the latest `gcp-test` run died during Terraform Apply with a Cloud Run healthcheck failure for `get-api-key-credit-v2`.

Diagnosis path: the v2 function code in `src/cloud/get-api-key-credit-v2/index.js` exports `handle`, but `infra/functions-v2.tf` still targeted `getApiKeyCreditV2` as the entry point.

Chosen fix: align the Terraform `build_config.entry_point` with the actual exported `handle`, and add a regression test in `test/infra/cloudBrowserEntrypoints.test.js`.

Next time: when a v2 Cloud Function fails at startup, check the Terraform `entry_point` before digging into runtime logs.
