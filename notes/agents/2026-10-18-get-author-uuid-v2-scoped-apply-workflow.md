# Scoped get-author-uuid-v2 production apply workflow

- **Unexpected hurdle:** the repository's existing gcp-prod workflow runs a whole-stack Terraform plan and apply. The Rank 1 plan-only workflow proves a small intended change set, but there was no production workflow constrained to that set.
- **Diagnosis path:** confirmed the prior Rank 1 plan run succeeded on c1bf1be115, its plan summary contained four expected resource actions, and no Terraform source changed between that commit and current main. Inspected the production workflow and confirmed it applies the full production plan.
- **Chosen fix:** add a manual-only Rank 1 apply workflow with a false-by-default confirmation input, fixed Terraform targets, an exact saved-plan resource/action check, and apply of that same saved plan. Unexpected actions stop before apply. Add a workflow contract test. The workflow has not been dispatched and no production infrastructure has been applied.
- **Next-time guidance:** review the exact scoped plan, obtain explicit approval before dispatching with confirmation enabled, then verify configured-origin CORS and authentication behavior. The existing roles/run.invoker approval is preserved; it does not authorize unrelated IAM or whole-stack changes.

## Validation

- `DADETO_CHECK_TIMEOUT_MS=7200000 TMPDIR=/home/matt/dadeto/.tmp DADETO_COVERAGE_SHARD_SIZE=40 DADETO_COVERAGE_WORKER_HEAP_MB=1024 DADETO_JEST_POOL_DIR=/home/matt/dadeto/.tmp/jest-pool-rank1-apply DADETO_COVERAGE_DIR=/home/matt/dadeto/.tmp/coverage-rank1-apply npm run check` — passed, exit 0. The new workflow contract test ran in the unit coverage shards; all test shards and 11/11 local E2E passed; all 10 static gates passed; all four coverage metrics were 100%; duplication reported 0 clones.
- `node -e 'const fs=require("node:fs"); const yaml=require("js-yaml"); const workflow=yaml.load(fs.readFileSync(".github/workflows/get-author-uuid-v2-apply.yml","utf8")); if (!workflow.jobs?.["terraform-apply"]?.steps?.some(step => step.name === "Apply the verified plan")) process.exit(1);'` — workflow YAML parsed and the scoped apply step was present.
- `terraform fmt -check -recursive -diff -no-color` — passed.
- `git diff --check` — passed.
- No workflow was dispatched and no production infrastructure was applied. The direct focused Jest invocation stalled without output, so the authoritative full check was used and included the focused workflow test successfully.
