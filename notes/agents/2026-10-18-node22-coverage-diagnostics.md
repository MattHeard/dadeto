# Node 22 coverage diagnostics and Rank 1 apply guard

## Hurdle

The Node 22 full-check workflow passed all 48 unit shards and static gates, but failed the unchanged branch-coverage threshold at 99.634%. The available log did not identify the missed branches. A fresh Rank 1 production plan also differed from the old allowlist: it updated the function and static config and replaced the source archive; it did not change the invoker binding.

## Diagnosis and fix

Local coverage data under Node 24 showed 100%, so it could not explain the Node 22 result. Added a tested helper that reports uncovered Istanbul branch arms with source locations when the coverage threshold fails. Updated the guarded apply workflow and its regression to match only the user-approved three-action set, removed the invoker target, and aligned the quality guide with the three-second progress heartbeat.

## Next time

Use the Node 22 full-check result as authoritative for this coverage discrepancy; preserve the 100% threshold and add tests for the exact reported branch arms. Rerun the production apply only after the plan guard matches the approved addresses and actions exactly.
