# Scoped function endpoint Terraform plan

- **Unexpected hurdle:** Local terraform validate was rejected by the repo
  wrapper, which permits formatting locally and routes Terraform validation
  through GitHub Actions.
- **Diagnosis:** The existing redacted production plan workflow covered only
  get-author-uuid-v2. Rank 2 already has an offline registry contract, but
  lacked a production plan artifact that could be reviewed without applying it.
- **Chosen fix:** Add a choice-limited workflow input for either the existing
  Rank 1 plan or the isolated endpoint-registry resource targets. Keep the Rank
  1 default and reject unknown scopes; retain the summary that emits addresses
  and actions without resource values.
- **Evidence:** Focused workflow contract tests passed (1 suite, 4 tests), the
  full npm run check passed, Terraform formatting passed, and git diff check
  passed. A credential-free GitHub Terraform validation and the Rank 2 plan
  dispatch are pending the push.
- **Next-time guidance:** Run Terraform validation through the repository
  workflow. Dispatch the registry scope, inspect the redacted action summary,
  and stop before apply or a live registry read until explicitly authorized.
