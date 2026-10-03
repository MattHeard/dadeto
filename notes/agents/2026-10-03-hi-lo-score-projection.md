# Hi-lo score field projection

Object selection and score projection now have separate owners. The projection
reads correct, incorrect and total independently in that order and delegates
their existing Number(value)-or-zero conversion. Do not add finite or nonnegative
validation: negative values and Infinity currently survive normalization.
The accessor regression protects asymmetric results and exact read order.

Focused suite passes 30 tests with exact 100% module coverage:
`.tmp/score-projection-tests.log`. Static aggregate fails only duplication37,
down from 38: `.tmp/score-projection-static.log`. Build passes:
`.tmp/score-projection-build.log`. No threshold or suppression changes.
Full aggregate follows; dadeto-aaou and the zero-clone goal remain active.

Terminal full checkpoint: `TMPDIR=/home/matt/dadeto/.tmp
DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exits 1; duplication alone fails
among ten outer gates at 37 clones. Exact global coverage: lines 20328/20328,
statements 21182/21182, functions 7069/7069, branches 10201/10201. Evidence:
`.tmp/clone-goal-37-full-check.log` and `reports/coverage/coverage-summary.json`.
The zero-clone goal is not complete.
