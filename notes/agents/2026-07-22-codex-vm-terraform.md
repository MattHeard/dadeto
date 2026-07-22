# Codex VM Terraform loop

- **Loop contract:** If every Codex VM resource is gated by an explicit production-only local, static policy tests should prove that test environments remain unchanged while production can opt in through the deployment workflow.
- **Acceptance evidence:** `terraform fmt -check -recursive infra`, the focused Codex VM Jest test, and `npm run check`.
- **Unexpected hurdle:** The repository's required `bd` executable was unavailable, and the user explicitly asked to continue without it.
- **Diagnosis:** Existing infrastructure tests characterize Terraform as source text, which provides deterministic coverage without requiring GCP credentials or a remote backend.
- **Fix:** Added a dedicated production-gated Terraform module and static policy tests for the security boundaries that must not regress.
- **Evidence:** `npx jest test/infra/codexVmTerraform.test.js test/scripts/gcp-prod-workflow.test.js --runInBand --coverage=false` passed (2 suites, 6 tests); `/tmp/terraform-bin/terraform init -backend=false -input=false && /tmp/terraform-bin/terraform validate` passed with Terraform 1.13.3; `npm run check` reached passing lint, dependency, parse, duplication, entrypoint, thin-file, export, and TSDoc checks but could not pass because the pre-existing dependency audit reports eight high-severity transitive advisories and `test/core/local/gcp-simulator/payment-webhook-route.test.js` times out under the repository's Node 24 runtime. The focused simulator rerun reproduced both timeouts independently of this Terraform-only change.
- **Next time:** Keep the external address intentionally output-free and add any future VM permissions to administrator bindings, not to the VM service account.
