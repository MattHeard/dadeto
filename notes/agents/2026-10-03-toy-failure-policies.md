# Shared toy failure execution and bound rejection policies

Strict duplication fell from 94 to 93 without ignores or configuration changes.
runToyFailureBoundary owns the catch while the caller owns failure presentation.
It retains success identity and passes the original thrown value to the formatter;
an error thrown by that formatter still escapes the boundary.
createToyMessageBoundary binds a family's compact/pretty message-only schema.

runToyCalculation retains valid:false/error and readable defaults.
appendReferenceList retains appended:false/error with compact JSON.
legacyFeasibilityBoundary retains feasible:false/reason with compact JSON.
Modern memoryObjectListAppend uses the shared executor but keeps its distinct
Error-instance-versus-String formatting policy. Parsers and write order are
unchanged. Existing public symbols remain available.

Unexpected hurdles: the first extraction moved the clone into common imports;
binding module-owned policies removed that pair but exposed a closure suffix
with an unrelated Symphony module. Separating catch execution from formatter
binding removed the new match. Neither intermediate 94-clone scan was accepted
as a reduction. The existing tryOr helper was unsuitable because it discards
the thrown value required by these contracts.

Evidence: .tmp/toy-failure-policies-tests-final.log records 1,255 passing tests
in 137 suites and exact 100% statements/branches/functions/lines for
formatToyError, memoryObjectListAppend, and segmentAssignmentFeasibilityCore.
New regressions verify numeric messages, omitted primitive/object messages,
null/undefined legacy TypeErrors, one message read, escaping message getter
errors, and raw thrown-value/success identity in the executor.
.tmp/toy-failure-policies-scan.log records 93 clones and no shared-failure-owner
matches. .tmp/toy-failure-policies-static.log records nine other gates passing;
.tmp/toy-failure-policies-build.log records a successful static build.

This pushed checkpoint does not complete dadeto-aaou. The final zero-clone
implementation still requires terminal full npm run check and exact global
coverage proof, not just focused source coverage.
