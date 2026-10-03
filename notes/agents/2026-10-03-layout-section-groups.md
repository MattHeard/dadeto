# Retained toy section grouping

The view binder now delegates section grouping to its own policy. Input key,
input value and both controls nodes remain one group; output is a separate
key/value group. Logical order still drives rendering without recreating nodes.
The stable insertion boundary is read before section grouping. A getter-order
regression protects this boundary and the retained input/control node identities.

Focused model/view suite and exact coverage are recorded in
`.tmp/layout-groups-tests.log`. Static aggregate fails only duplication38,
down from 39: `.tmp/layout-groups-static.log`. Build passes:
`.tmp/layout-groups-build.log`. Strict minTokens14 and detector scope remain
unchanged, without new suppressions. Full aggregate follows; dadeto-aaou and
the zero-clone goal remain active.

Focused model/view suite passes four tests with exact 100% coverage of both
owners. Terminal full checkpoint: `TMPDIR=/home/matt/dadeto/.tmp
DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exits 1; duplication alone fails
among ten outer gates at 38 clones. Exact global coverage: lines 20328/20328,
statements 21182/21182, functions 7069/7069, branches 10201/10201. Evidence:
`.tmp/clone-goal-38-full-check.log` and `reports/coverage/coverage-summary.json`.
This checkpoint does not complete the zero-clone goal.
