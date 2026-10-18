# Function endpoint apply workflow working directory

- **Unexpected hurdle:** The guarded Rank 2 production workflow failed before checkout because its confirmation shell step inherited `working-directory: infra`, which does not exist on a fresh runner.
- **Diagnosis:** Workflow run [39138295233](https://github.com/MattHeard/dadeto/actions/runs/39138295233) showed the explicit confirmation input was true, then Bash failed to start in `/home/runner/work/dadeto/dadeto/infra`. Terraform did not run.
- **Fix:** Run only the pre-checkout confirmation step from `${{ github.workspace }}`. Keep the job's `infra` default for Terraform steps after checkout, and assert the override in the workflow contract test.
- **Next time:** A job-level `defaults.run.working-directory` applies to shell steps before checkout too. Give pre-checkout shell steps an existing directory explicitly; then dispatch the guarded workflow and confirm it reaches plan generation before allowing an apply.
