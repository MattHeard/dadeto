# Configured feasibility core

Runner-shift coverage, world-line feasibility, and maximum-speed adapters now live beside their existing pure calculations in `segmentAssignmentFeasibilityCore.js`. Public files re-export the same functions. The core already owns point indexing, candidate resolution, motion calculation, and the legacy JSON failure boundary, so moving the configurations eliminates repeated imports rather than introducing another parallel helper layer.

Calculation bodies were moved unchanged, including first-covering-shift selection, String/Number coercion, empty-object parsing fallback, optional collection defaults, zero-time motion behavior, and result field order.

Evidence: `.tmp/configured-feasibility-core-tests.log` records 1,217 passing tests / 134 suites with exact 100% statements, branches, functions, and lines for the expanded core. `.tmp/configured-feasibility-core-static.log` records nine passing static gates and duplication alone failing at 113 clones (down from 114). The current report still includes a legacy error-boundary suffix match against memory list append; do not mistake this checkpoint for zero duplication. Parent goal remains open.

Full aggregate at pushed `4e42a9625d`: `TMPDIR=/home/matt/dadeto/.tmp DADETO_COVERAGE_SHARD_SIZE=40 npm run check` completed exit 1 solely for duplication (113 clones), with all nine other gates passing. All unit shards and nine browser tests passed (8.3 seconds). Exact merged coverage: lines 19,971/19,971; statements 20,777/20,777; functions 6,910/6,910; branches 9,794/9,794. Evidence: `.tmp/shared-toy-boundaries-full-check.log` and `reports/coverage/coverage-summary.json`. This verifies the combined UTC-minute, composition, and feasibility checkpoints, not completion of the parent goal.
