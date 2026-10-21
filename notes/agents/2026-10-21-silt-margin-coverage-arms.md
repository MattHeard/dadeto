# Silt Margin exact-head coverage arms — 2026-10-21

The previous Full Check reported two simulation branch indexes without source locations. The uploaded coverage artifact `12299670307` maps them to `simulation.js:482` (growth consequences when the guardian is already absent) and `simulation.js:505` (the signal interaction guard returning false). The third uncovered arm was `silt-margin.js:145`, rejecting a saved sent signal while the crossing remains flooded.

Added Silt Margin regressions for each arm using supported simulation states. The tests cover a second growth after the guardian is killed, interaction after reaching the signal with the guardian killed, and normalization of a sent signal paired with a closed crossing. No gameplay source changed.

Evidence: `npm run check:impact:run -- --files src/core/browser/game/threefold/silt-margin.js src/core/browser/game/threefold/simulation.js test/core/browser/game/threefold-silt-margin.test.js` passed 14 suites / 201 tests, ESLint, core parse, duplication (0 clones), and 100% changed-file line and branch coverage. `npm run build` passed. `npm run check` passed all 10 gates; its direct impact stage passed 1 suite / 9 tests.

Next: push the change and verify the exact-head Full Check and Terraform Validate. Keep the Rank 3 spec Partial until its other unfinished acceptance items are completed.
