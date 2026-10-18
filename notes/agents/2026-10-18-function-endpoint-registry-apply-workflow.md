# Function endpoint registry apply workflow

- Unexpected hurdle: the existing production apply workflow targets the whole Terraform stack, while the registry workflow only creates a plan.
- Diagnosis: the registry is three count-indexed production resources, and the plan workflow targets their resource blocks while Terraform reports instance addresses ending in `[0]`.
- Chosen fix: add a separate manual workflow restricted to `main`, require a false-by-default confirmation input, compare the saved plan against exactly the three expected creates, and apply only that checked plan. Add a contract test so the resource scope and guard remain explicit.
- Next-time guidance: dispatch only after the exact production plan has been reviewed and the separate authorization is recorded. If the plan contains any extra, missing, or changed action, stop and review the drift instead of widening the allowlist.
