# get-author-uuid-v2 deployment

- Unexpected hurdle: the application handler and generated package were ready, but publishing it also requires Terraform-managed public Cloud Run invoker IAM.
- Diagnosis: the spec requires browser access with Firebase token verification, while a prior automatic approval review rejected adding the public invocation binding and asked for explicit authorization. The environment has not applied infrastructure.
- Fix: preserve the safe work: permission-aware CORS/response adapters, GET/OPTIONS method handling, generated cloud package inclusion, and focused/full-check coverage. `npm run build:cloud` completed and generated the entrypoint package.
- Next time: keep Terraform resource wiring in the repo and separate it from infrastructure application. Run validation and plan through an authorized workflow; use a configured-origin smoke test before marking the Notion spec Done.


## Authorized deployment configuration loop

- User approved the public `roles/run.invoker` binding for this new Cloud Function on 2026-10-16.
- Added a Terraform-managed gen2 function using the generated package, existing runtime service account, and shared environment configuration; added the public invoker member and output URL.
- Static config now receives the function's deployed service URI from Terraform, keeping the browser endpoint tied to the actual resource.
- No infrastructure was applied.


## Credential-free Terraform validation harness

- Unexpected hurdle: the managed Terraform wrapper permits `fmt` only, so `terraform validate` cannot run in this workspace.
- Diagnosis: the production Terraform workflow validates and then mutates infrastructure; it is not suitable for a validation-only check.
- Fix: added `.github/workflows/terraform-validate.yml`, which builds generated cloud packages, initializes providers with `-backend=false`, and runs formatting and validation without GCP credentials or an apply step.
- Next time: use the validation workflow for Terraform-only changes, and keep remote-state plan/apply in the authorized deployment workflow.
