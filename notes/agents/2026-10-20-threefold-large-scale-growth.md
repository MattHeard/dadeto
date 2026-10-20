# THREEFOLD large-scale growth regression

- **Unexpected hurdle:** The default focused test run could not create `/tmp/dadeto-jest-pool/active` in the read-only sandbox, so Jest never started.
- **Diagnosis:** This was a runner filesystem restriction, not a failing assertion. The worktree supports an isolated ignored pool when the evaluator runs with approved elevated access.
- **Chosen fix:** Kept the implementation test-only and ran the focused evaluator with `DADETO_JEST_POOL_DIR=.tmp/jest-pool-threefold-large-scale`; the synthetic +3 to +4 case passed with two district structures and one Latchfolk resident.
- **Next-time guidance:** On this restricted host, set `DADETO_JEST_POOL_DIR` to a worktree-local temporary directory before running Jest, and classify an EROFS before test startup as environment/config drift.
- **Open question:** Large-scale scene authoring and fates for multiple distinct population actors still require future THREEFOLD slices; this regression only verifies the current reducer's one-resident behavior at the upper scale transition.
