# Shared owner availability context

Full run session9185 completed before production edits: only duplication failed,
178 clones. Current merged coverage includes appendReferenceList and has exact100
lines19950/19950, statements20744/20744, functions6842/6842, branches9875/9875.
Evidence: .tmp/reference-list-check-full.log and reports/coverage artifacts.

The combined predicate repeated owner filtering and overlap evaluation twice.
createAssignmentContext now prepares point/segment indexes and proposed interval;
ownerIsFree evaluates one owner against that context. canAppendAssignment uses
the same helpers. The combined toy still computes asset and custodian results
separately before combining them, preserving its evaluation order.

Four conflict-matrix regressions passed against the original implementation;
the final directory suite passes121 tests with exact100 coverage in both changed
source modules. Removed the touched combined predicate's Stryker suppression
comments without adding exemptions. Evidence: .tmp/owner-availability-tests.log
and .tmp/owner-availability-check-static.log. Canonical owner: dadeto-aaou.
