# Symphony unavailable-trigger response

Launch and refresh routes share the exact 501 response envelope. The named
policy ignores transport returns. Keep the helper call followed by bare return:
returning its void expression conflicts with consistent-return on the successful
async route path. Rejections must never read status or invoke a launcher.

Focused app suite passes 24 tests with exact 100% owner coverage:
`.tmp/missing-trigger-tests.log`. Refined static aggregate fails only duplication36
(37 baseline): `.tmp/missing-trigger-static.log`. Build passes:
`.tmp/missing-trigger-build.log`. No detector changes or suppressions.
Full aggregate follows; dadeto-aaou and the zero-clone goal remain active.

Terminal full checkpoint: `TMPDIR=/home/matt/dadeto/.tmp
DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exits 1; duplication alone fails
among ten outer gates at 36 clones. Exact global coverage: lines 20329/20329,
statements 21183/21183, functions 7070/7070, branches 10201/10201. Evidence:
`.tmp/clone-goal-36-full-check.log` and `reports/coverage/coverage-summary.json`.
The zero-clone objective remains unfinished.
