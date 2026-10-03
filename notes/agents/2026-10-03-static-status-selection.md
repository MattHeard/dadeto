# Static-config status selection

The shared lazy selector now owns the undefined-only fallback to unknown.
Do not replace it with nullish coalescing or cache the status property: the
original selected path reads status twice, and the second read can be null,
zero or undefined. Accessor regressions preserve those exact error messages.

The first static run found the selector generic inferred only number. The
callback's explicit documented status-or-unknown union fixes typing without
runtime coercion. Refined static aggregate fails only duplication, reduced
from 45 to 44 clones: `.tmp/static-status-static.log`. No detector changes.
Focused suite passes 12 tests with exact 100% module coverage:
`.tmp/static-status-tests.log`. Build passes: `.tmp/static-status-build.log`.
Full aggregate checkpoint follows; dadeto-aaou and the goal remain active.

Terminal full checkpoint: `TMPDIR=/home/matt/dadeto/.tmp
DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exits 1; duplication alone fails
among ten outer gates, with 44 clones. Exact global coverage: lines 20331/20331,
statements 21183/21183, functions 7060/7060, branches 10205/10205. Evidence:
`.tmp/clone-goal-44-full-check.log` and `reports/coverage/coverage-summary.json`.
This checkpoint does not complete the zero-clone objective.
