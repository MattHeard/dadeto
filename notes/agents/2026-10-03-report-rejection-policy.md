# Moderation report rejection policy

The strict report identified repeated missing-field response objects. One typed
constructor now owns their common HTTP envelope and exact message format.
Do not move reporter resolution below variant rejection: both fields were
already resolved first. The getter-order regression preserves this behavior
and verifies rejected requests never consult duplicate storage or timestamps.

Focused report core and handler suites pass 37 tests with exact 100% module
coverage. Evidence: `.tmp/report-rejection-tests.log`. Static aggregate fails
only duplication, now 48 clones (49 baseline): `.tmp/report-rejection-static.log`.
Both builds pass: `.tmp/report-rejection-build.log` and
`.tmp/report-rejection-cloud-build.log`. No thresholds or suppressions changed.
The owning bead dadeto-aaou and zero-clone goal remain open.

Terminal full acceptance: `TMPDIR=/home/matt/dadeto/.tmp
DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exits 1 with duplication the only
failure among ten outer gates, at 48 clones. Exact global coverage is lines
20335/20335, statements 21186/21186, functions 7057/7057, branches 10211/10211.
Evidence: `.tmp/clone-goal-48-full-check.log` and
`reports/coverage/coverage-summary.json`. This checkpoint is progress, not
completion of the zero-clone goal.
