# Conditional assignment adapters

Legacy asset and runner writers repeated their parse/error adapter and imports.
`conditionalAssignments.js` owns their shared factory, with separate asset and
runner strategies retaining the original validation order, metadata and append
behavior. Existing module paths re-export the same public toy names.

Evaluator evidence: all 134 toy suites / 1,218 tests passed, shared module exact
100% statements/branches/functions/lines (`.tmp/conditional-assignment-tests.log`,
`.tmp/conditional-assignment-coverage`). Static aggregate passed nine gates;
duplication alone fails at 129 clones, reduced from 134
(`.tmp/conditional-assignment-static.log`). Strict minTokens remains 14, with
no exceptions, exemptions or ignore pragmas added.

The extraction leaves two internal append-shape clones visible in the fresh
JSON report. A follow-up can share the append envelope without evaluating
assignment fields before rejecting infeasible world lines: preserve that order
to avoid turning an ordinary rejection into a malformed-candidate error.
