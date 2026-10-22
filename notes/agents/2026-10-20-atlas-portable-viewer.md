# Atlas portable viewer loop

- **Unexpected hurdle:** the first focused run could not resolve the injected Zod test double, and the static-copy regression expected warnings for the old directory set. A later focused run hit `EROFS` because Jest tried to persist its cache under `/tmp`.
- **Diagnosis:** the new test lived one directory deeper than the existing interpretability test, the copy planner now intentionally visits two additional source trees, and this host exposes `/tmp` as read-only.
- **Fix:** corrected the relative helper import, updated missing-tree expectations, added assertions that core interpretability and Zod files reach their public destinations, and reran Jest with worktree-local `TMPDIR` and cache directories. Added explicit V3/V4 import coverage through core lineage validation.
- **Next time:** for a nested browser test, calculate relative imports from the test directory itself; when adding a declarative copy tree, update both the successful copy path and missing-source regression; when `/tmp` is read-only, keep test caches and temp files inside the writable worktree.
- **Open verification:** keep the exact-head Full Check result linked to the PR and continue with the next ranked not-done spec after this Bead closes.
