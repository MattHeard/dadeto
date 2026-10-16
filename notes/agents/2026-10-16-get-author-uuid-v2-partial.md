# get-author-uuid-v2 deployment

- Unexpected hurdle: the application handler and generated package were ready, but publishing it also requires Terraform-managed public Cloud Run invoker IAM.
- Diagnosis: the spec requires browser access with Firebase token verification, while a prior automatic approval review rejected adding the public invocation binding and asked for explicit authorization. The environment has not applied infrastructure.
- Fix: preserve the safe work: permission-aware CORS/response adapters, GET/OPTIONS method handling, generated cloud package inclusion, and focused/full-check coverage. `npm run build:cloud` completed and generated the entrypoint package.
- Next time: resume Terraform URL/archive/function/IAM wiring only after the exact public-invoker change is authorized; then run Terraform plan and a configured-origin smoke test before marking the Notion spec Done.
