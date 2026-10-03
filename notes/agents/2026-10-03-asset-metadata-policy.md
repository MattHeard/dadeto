# Deferred asset assignment metadata

The strict 14-token report matched the nested asset metadata closure against
Symphony configuration. Extracting the actual metadata materialization policy
and binding its request removed the match without changing detector settings.

Keep metadata lazy: infeasible assignments must return before materializing it.
Raw response identity is intentionally distinct from persisted string identity.
The regression uses numeric asset identity to guard that distinction.

Focused acceptance: the safeAssignmentToys and segmentSpeedContract suites pass
29 tests, with exact 100% coverage of conditionalAssignments.js in all metrics.
Evidence: `.tmp/asset-metadata-tests.log`. Static aggregate acceptance has only
duplication failing, now 50 clones rather than 51; evidence:
`.tmp/asset-metadata-static.log`. Build passes: `.tmp/asset-metadata-build.log`.

The zero-clone goal and dadeto-aaou remain open. Full repository acceptance is
recorded separately after the checkpoint completes.

Terminal full checkpoint: `TMPDIR=/home/matt/dadeto/.tmp
DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exits 1 with only duplication
failing among ten outer gates (50 clones). Test suite passes; exact global
coverage is lines 20338/20338, statements 21188/21188, functions 7058/7058,
branches 10211/10211. Evidence: `.tmp/clone-goal-50-full-check.log` and
`reports/coverage/coverage-summary.json`. This is progress, not goal completion.
