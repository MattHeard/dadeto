# Directed temporal boundary matching

Both directions now use one end-to-start predicate, retaining the original
short circuit and requiring both timestamp and endpoint identity to match.
The regression gives the unused reverse start getter a throwing implementation.
Do not use that same throwing fixture to assert reversed operands: reversed
evaluation legitimately reads it. The initial fixture made that mistake and was
corrected without changing the production policy.

Evidence: `.tmp/temporal-boundary-tests.log` for focused exact coverage;
`.tmp/temporal-boundary-static.log` for static aggregate with only duplication
failing at 46 clones (47 baseline); `.tmp/temporal-boundary-build.log` for build.
Strict configuration is unchanged. dadeto-aaou and the zero-clone goal remain
active. Full aggregate evidence follows this checkpoint.

Focused suite passes 10 tests with exact 100% module coverage in all metrics.
Terminal full checkpoint: `TMPDIR=/home/matt/dadeto/.tmp
DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exits 1; duplication is the sole
failure among ten outer gates, with 46 clones. Exact global coverage: lines
20334/20334, statements 21185/21185, functions 7058/7058, branches 10209/10209.
Evidence: `.tmp/clone-goal-46-full-check.log` and
`reports/coverage/coverage-summary.json`. The goal is not complete.
