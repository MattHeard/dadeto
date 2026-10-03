# Codex runner operation binding

The core factory binds its options reference to a named async launch operation.
Each invocation still constructs a fresh detached launcher. The regression
calls the operation detached, changes the core options between runs, and checks
separate log paths and processes.

The public wrapper snapshots incoming options and supplies pathModule. An
initial mutable-options test against that wrapper therefore expected the wrong
behavior. Test the core directly for reference semantics and explicitly supply
the wrapper-owned path dependency; do not change wrapper snapshots to satisfy
the test. The existing wrapper lifecycle tests remain intact.

Focused suite passes five tests with exact 100% core coverage:
`.tmp/codex-launch-binding-tests.log`. Static aggregate fails only duplication41
(42 baseline): `.tmp/codex-launch-binding-static.log`. Build passes:
`.tmp/codex-launch-binding-build.log`. No detector or suppression changes.
Full acceptance follows; dadeto-aaou and the zero-clone goal remain active.

The first full check exposed a new formatted nested payload-cast tail and
restored the clone count to 42. Name the typed payload adaptation before
construction, leaving one simple launch call. Focused exact coverage and the
refined static report confirm 41 again. Always use the post-formatting report,
not an earlier concurrently generated report, for terminal acceptance.

Refined terminal full checkpoint: `TMPDIR=/home/matt/dadeto/.tmp
DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exits 1, with duplication the sole
failure among ten outer gates at 41 clones. Exact global coverage is lines
20328/20328, statements 21180/21180, functions 7062/7062, branches 10203/10203.
Evidence: `.tmp/clone-goal-41-refined-full-check.log` and
`reports/coverage/coverage-summary.json`. The goal remains unfinished.
