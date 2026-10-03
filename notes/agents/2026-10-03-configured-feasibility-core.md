# Configured feasibility core

Runner-shift coverage, world-line feasibility, and maximum-speed adapters now live beside their existing pure calculations in `segmentAssignmentFeasibilityCore.js`. Public files re-export the same functions. The core already owns point indexing, candidate resolution, motion calculation, and the legacy JSON failure boundary, so moving the configurations eliminates repeated imports rather than introducing another parallel helper layer.

Calculation bodies were moved unchanged, including first-covering-shift selection, String/Number coercion, empty-object parsing fallback, optional collection defaults, zero-time motion behavior, and result field order.

Evidence: `.tmp/configured-feasibility-core-tests.log` records 1,217 passing tests / 134 suites with exact 100% statements, branches, functions, and lines for the expanded core. `.tmp/configured-feasibility-core-static.log` records nine passing static gates and duplication alone failing at 113 clones (down from 114). The current report still includes a legacy error-boundary suffix match against memory list append; do not mistake this checkpoint for zero duplication. Parent goal remains open.
