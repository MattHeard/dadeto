# Fulfillment and assignment rejection aggregate checkpoint

At pushed commit `7e1c7af4fb`, ran:

`TMPDIR=/home/matt/dadeto/.tmp DADETO_COVERAGE_SHARD_SIZE=40 npm run check`

Terminal exit: 1. Outer `check-summary`: 10 gates, one failure, duplication only
(104 clones). All other nine gates passed. Log:
`.tmp/fulfillment-rejections-full-check.log`.

Merged `reports/coverage/coverage-summary.json` proves exact coverage:

- Lines: 19977/19977.
- Statements: 20785/20785.
- Functions: 6920/6920.
- Branches: 9784/9784.

Unexpected hurdle: sandbox startup failed with ENOSPC before execution. Used
the approved elevated runner with repository-local temporary storage, rather
than interpreting this as a source regression or restarting a live evaluator.

Keep source unchanged throughout an aggregate run. Poll the same confirmed
live session until terminal, and distinguish the outer summary from nested
test success. The next loop is recorded in `dadeto-aaou`: shared resolved-point
indexing, retaining caller-specific parsing and failure policies. The zero-clone
goal remains incomplete; this checkpoint is not a green aggregate claim.
