# Shared assignment overlap predicate

Person and asset predicate toys repeated owner filtering, point/segment indexing,
interval resolution and overlap evaluation. canAppendAssignment now owns that
algorithm in the existing assignmentIntervals module. Each caller keeps its
exported parser and normalizer, including distinct error strings and accepted
object shapes. Compatibility exports of resolveInterval/overlaps remain intact.

The touched predicate files' historical Stryker suppression comments were
removed, not transferred to the helper. No scanner setting or exemption changed.

Evidence: .tmp/assignment-predicate-tests.log (117 tests across10 suites; exact100
statements, branches, functions and lines in the three changed modules),
.tmp/assignment-predicate-duplication.log (184 to180 strict14 clones), and
.tmp/assignment-predicate-check.log. Owner: dadeto-aaou. Duplication remains
unfinished and full aggregate success must still be proven.
