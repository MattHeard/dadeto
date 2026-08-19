# Billing-return mutation slice

- Unexpected hurdle: the initial fresh scan had no survivors but timed out on the loop-increment mutation, which changed `attempt += 1` to `attempt -= 1` and created an infinite loop.
- Diagnosis: the mutable counter update was itself a resource-risk mutation target; the existing tests verified normal outcomes but could not complete against that mutant.
- Chosen fix: replaced the mutable-counter loop with bounded attempt indices from `Array.from`, preserving polling and wait behavior while removing the unbounded decrement mutation.
- Evidence: the final Stryker scan for `src/core/browser/billing/billing-return-core.js` executed 23 mutants and killed all 23 with 0 survivors and 0 timeouts. Focused Jest passed 1 test, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: treat mutation timeouts as robustness failures even when survivor count is zero; refactor loop control when a mutated update can escape the intended bound.
