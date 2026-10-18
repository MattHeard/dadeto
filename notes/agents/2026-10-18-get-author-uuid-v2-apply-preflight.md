# Rank 1 apply preflight working-directory failure

- Unexpected hurdle: the authorized scoped apply workflow failed before checkout although `confirm_production_apply=true` was present.
- Diagnosis: the job-level default working directory is `infra`, but the confirmation preflight runs before checkout creates that directory. GitHub Actions could not start Bash in the missing path, so Terraform and deployment steps were skipped.
- Fix: run only the preflight from `${{ github.workspace }}`. Keep the Terraform action allowlist and resource scope unchanged.
- Next-time guidance: when a workflow step runs before checkout, override any repository-relative job working directory to an existing runner directory. After the retry, verify the plan guard and deployment steps, then run the configured-origin smoke without exposing tokens.
