# Reuse assignment persistence and response envelopes

The strict14 clone report repeated legacy asset/runner append construction and
success/failure serialization. Reusing appendOneAssignment removed two clones
(192 to190). Existing appendValidatedAssignment and formatAssignmentFailure
then removed two more (190 to188), without using strictAssignmentBoundary or
strict ID validation for the legacy toys.

Keep the early feasibility rejection before constructing assignment metadata:
otherwise invalid requests can fail during metadata access instead of returning
the original feasibility reason. Persisted IDs retain String(value || '') while
asset response metadata retains the raw ID. Runner metadata still has shiftId.
No new exemption or suppression was added; the touched asset toy's historical
Stryker suppression was removed.

Evidence: .tmp/assignment-envelope-tests-final.log (29 tests and exact100 coverage
for both writers and strictAssignmentCore), .tmp/assignment-envelope-check.log
and reports/duplication/jscpd-report.json. Canonical owner: dadeto-aaou. This is
not completion of the full zero-duplication goal.
