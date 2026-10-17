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
  passed. Credential-free Terraform validation passed in workflow
  [39079198767](https://github.com/MattHeard/dadeto/actions/runs/39079198767).
  Registry plan [39079198819](https://github.com/MattHeard/dadeto/actions/runs/39079198819)
  passed and listed only creates for the dedicated bucket, its public-reader
  binding, and the manifest object. No apply ran.
- **Next-time guidance:** Request explicit authorization for the three planned
  production creates, then verify the stable anonymous HTTPS manifest before
  changing any consumer.
