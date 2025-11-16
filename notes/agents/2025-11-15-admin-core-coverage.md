## Unexpected hurdles
- Admin helper coverage barely missed 100% because the `normalize`/`summarize` helpers always received an argument (even when `undefined`), so the default-arg branches in the helpers never ran and Jest still reported uncovered branches.
- Similarly, the missing-script logger branch remained untouched since `reportMissingGoogleIdentity` only logged when the safe logger already exposed an `error` function.

## What I learned
- Dropping the default parameters and normalizing the dependency bag inside each helper (`deps ?? {}`) let the code run with `undefined` inputs without triggering the un-exercised branches, so the coverage report no longer flagged those lines.
- Centralizing the missing-script fallback behind `resolveLogger` keeps `reportMissingGoogleIdentity` lean and removes the redundant branch that was blocking 100% coverage.

## Follow-ups
- If future coverage spikes around Google sign-in helpers, revisit whether default parameters are being exercised or whether the helper can be rewritten so those branches disappear again.
