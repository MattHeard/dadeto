Unexpected hurdle: the moderation plan was already mostly implemented, but the full repo test run still exposed a single branch-coverage hole in `calculateNextVisibility`.
Diagnosis path: I reran the targeted moderation test, generated coverage metadata, and traced the missing branch to a redundant nullish fallback inside the admin-locked return path.
Chosen fix: removed the unnecessary `variantData ?? {}` in that return path so the existing admin-locked behavior stayed the same while branch coverage reached 100%.
Next-time guidance: when a plan is already largely present, verify the remaining gap with coverage artifacts before adding broader features; the fix is often a tiny cleanup, not a new behavior change.
