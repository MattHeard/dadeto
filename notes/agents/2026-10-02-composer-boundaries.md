# Canonical and procurement-normal composer boundaries

Both composers previously repeated JSON parsing and catch-to-fulfillmentFailure
handling. Their public entries now use `fulfillmentBoundary` with named parsed
request builders. Validation order, canonical space-point merging, sequence
continuity and JSON field order remain in those builders. Removed the two
blanket Stryker disable/restore blocks rather than suppressing extracted code.

Acceptance evidence: all 134 toy suites / 1,218 tests pass, both changed modules
have exact 100% statements/branches/functions/lines coverage
(`.tmp/composer-boundary-tests.log`, `.tmp/composer-boundary-coverage`). Static
check finishes with nine gates passing; duplication alone fails with 134 clones,
down from 135 (`.tmp/composer-boundary-static.log`). minTokens remains 14.

Prior full-check checkpoint at `639422286d` passed all tests/browser checks and
had exact global 100% coverage; its outer summary failed duplication alone at
135 (`.tmp/clone-goal-checkpoint-full.log`). The newer focused/static results do
not substitute for a final green full check when the overall goal is complete.
