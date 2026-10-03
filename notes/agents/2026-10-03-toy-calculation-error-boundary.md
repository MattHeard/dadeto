# Shared synchronous toy failure boundary

Spacetime world-line, temporal-relation, segment measurement, and travel
proposal wrappers repeated try/catch serialization. `runToyCalculation` now
owns that boundary beside the common toy formatters; calculations and parsers
remain unchanged.

Readable failures still default to two-space JSON; measurement and travel pass
zero explicitly for compact failures. Original `.message` access is retained:
non-string messages serialize unchanged, missing messages are omitted, and null
thrown values still produce the same TypeError rather than a new normalization.
Focused formatter regressions make those distinctions operationally visible.

Evidence: all 135 toy/formatter suites (1,223 tests) pass, with exact 100% lines,
statements, functions, and branches for all five changed source modules.
Artifacts: `.tmp/toy-calculation-boundary-tests.log`,
`.tmp/toy-calculation-boundary-coverage`.
`npm run check -- --skip-tests` passes nine gates and fails only duplication,
now 119 clones versus 121 before extraction.
Artifact: `.tmp/toy-calculation-boundary-static.log`.
No threshold, exemption, or suppression changes; the parent goal remains open.
