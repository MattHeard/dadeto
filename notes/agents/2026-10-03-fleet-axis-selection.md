# Fleet axis selection

Coordinate adjustment now uses the existing lazy conditional transform policy.
Keep addition inside the callback: the inactive axis must return its original
value without coercing either value or offset. The regression gives both values
throwing coercion methods and preserves legacy string addition on active axes.

Focused fleet/toy/presenter suites pass 65 tests across 13 suites with exact
100% module coverage: `.tmp/fleet-axis-tests.log`. Static aggregate fails only
duplication40 (41 baseline): `.tmp/fleet-axis-static.log`. Build passes:
`.tmp/fleet-axis-build.log`. Strict minTokens14 remains unchanged, without
new exemptions or ignore directives. Full aggregate follows; dadeto-aaou and
the zero-clone goal remain active.

Terminal full checkpoint: `TMPDIR=/home/matt/dadeto/.tmp
DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exits 1; duplication is the sole
failure among ten outer gates at 40 clones. Exact global coverage: lines
20326/20326, statements 21179/21179, functions 7063/7063, branches 10201/10201.
Evidence: `.tmp/clone-goal-40-full-check.log` and
`reports/coverage/coverage-summary.json`. The objective remains unfinished.
