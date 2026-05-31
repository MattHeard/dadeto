## What happened

The last coverage gap moved from `process-new-page` to `variant-redirect` after the random fallback was pushed down into the leaf helper.

## Diagnosis

`process-new-page` was still normalizing the optional random generator too early, so the existing "no random injected" test could not exercise the fallback branch in `createPageContext`.
Once that was fixed, the only remaining uncovered branch was the `href`-less early return in `variant-redirect`.

## Fix

I moved the random fallback to `createPageContext` and added a focused `variant-redirect` test for the missing `href` case.

## Next time

When a branch-coverage miss stays stubborn after a higher-level test already exists, check whether a helper is normalizing the value before the branch you care about can run.
