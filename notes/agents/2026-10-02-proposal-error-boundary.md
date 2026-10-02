# Proposal boundary and named builders

Normal fulfillment and procurement-prefix proposals shared the same legacy
valid/error serialization policy. `fulfillmentProposalBoundary` now owns that
policy; each public toy delegates to its named calculation builder. This keeps
JSON serialization and validation order unchanged while separating transport
handling from proposal construction.

The first helper-only extraction left the clone count at 137: repeated anonymous
callback endings matched unrelated modules. Extracting named builders tightened
the boundary and reduced the strict count to 135, without ignore pragmas or
changing minTokens 14.

Final consumer evaluator: all 134 toy suites, 1,218 tests passed; shared result
module and both changed proposal modules have exact 100% coverage on all four
metrics (`.tmp/proposal-boundary-final-tests.log`,
`.tmp/proposal-boundary-coverage`). Static aggregate has nine gates passing;
duplication alone fails at 135 (`.tmp/proposal-boundary-final-static.log`).
The initial directory-only test selection did not cover all helper branches;
use the complete toy consumer set when assessing this shared module.
