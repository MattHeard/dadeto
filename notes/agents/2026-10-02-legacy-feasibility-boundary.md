# Legacy feasibility request boundary

World-line assignment, runner-shift coverage and maximum-speed toys now use
`legacyFeasibilityBoundary` for their JSON parsing, empty-input fallback and
message-only feasible/reason failure envelope. Named calculations retain
strategy-specific validation and successful response fields. Removed the
world-line toy's blanket Stryker disable/restore block.

Acceptance: 134 toy suites / 1,218 tests pass; all four changed modules have
exact 100% statements/branches/functions/lines coverage
(`.tmp/feasibility-boundary-final-tests.log`, `.tmp/feasibility-boundary-coverage`).
Static aggregate passes nine gates; duplication alone fails with 127 clones,
down from 128 (`.tmp/feasibility-boundary-final-static.log`). minTokens remains
14, and no ignores or exemptions were introduced.

Adding the maximum-speed consumer did not independently lower the count beyond
127; it still removes a repeated parse/error contract. Use the refreshed report
to select the next structural extraction rather than cosmetic token changes.
