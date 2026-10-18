# Rank 1 apply preflight working-directory failure

- Unexpected hurdle: the authorized scoped apply workflow failed before checkout although `confirm_production_apply=true` was present.
- Diagnosis: the job-level default working directory is `infra`, but the confirmation preflight runs before checkout creates that directory. GitHub Actions could not start Bash in the missing path, so Terraform and deployment steps were skipped.
- Fix: run only the preflight from `${{ github.workspace }}`. Keep the Terraform action allowlist and resource scope unchanged.
- Second hurdle: the retry passed the exact four-action guard, uploaded the source archive, then failed to create the Cloud Run revision because the container did not listen on port 8080.
- Diagnosis: importing the generated function package locally reproduced `ERR_MODULE_NOT_FOUND` for `core/submit-shared.js`. The source handler imports `src/core/submit-shared.js`, but the cloud packaging manifest had not copied it into the function archive.
- Fix: copy `src/core/submit-shared.js` to `infra/cloud-functions/get-author-uuid-v2/core/submit-shared.js` and assert that mapping in `test/core/build/copy-cloud.test.js`. The rebuilt package imports successfully with no GCP credentials. This local reproduction avoided exporting raw production logs into GitHub Actions.
- Next-time guidance: when a workflow step runs before checkout, override any repository-relative job working directory to an existing runner directory. For startup failures, check the generated package's local import graph first. Inspect the current Terraform plan after partial applies before retrying; then run the configured-origin smoke without exposing tokens.
