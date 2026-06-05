# 2026-06-05 Node upgrade policy note

- Unexpected hurdle: the repo’s Node pins are split across CI workflows and Terraform, so a naive "bump Node" change would blur build tooling and deployed runtime support together.
- Diagnosis path: checked `.github/workflows/gcp-test.yml`, `.github/workflows/gcp-prod.yml`, `.github/workflows/netlify-prod.yml`, `infra/variables.tf`, and `infra/functions-v2.tf` to see where Node versions actually matter.
- Chosen fix: documented the upgrade policy in `docs/failure-modes/ci-cd.md` so the repo now distinguishes CI/build Node, local Node, and GCP runtime Node, and records that Node 26 is a follow-up rather than the immediate deployed target.
- Next-time guidance: before changing any Node pin, update the project note first, then validate the workflow/runtime split against the current Cloud Run Functions support matrix.
