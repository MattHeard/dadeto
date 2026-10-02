# Combined assignment transaction reuse

Waited for full aggregate session18833 to finish before production edits.
It failed only duplication (188 clones), with global coverage exactly100 across
lines19968, statements20756, functions6842 and branches9881.

Characterization added to segmentSpeedContract covers both combined writers,
default/custom collections, numeric identifier serialization, preservation of
unrelated root data and one root write for both records. All eight contract
tests passed before implementation.

commitAssetCustodianAssignment in safeAssignmentPersistence now constructs the
two writes and successful transaction envelope. Callers retain their distinct
validation order and ID normalization. formatCommitFailure centralizes only the
rejection envelope: legacy passes error.message; strict passes its established
assignmentErrorReason. Do not consolidate those policies accidentally.

Focused safe/validated/speed suites pass33/33 with exact100 coverage for all three
changed production modules. Evidence: .tmp/combined-commit-tests-final.log and
.tmp/combined-commit-check-static-final.log. Canonical owning bead: dadeto-aaou;
the zero-duplication aggregate goal remains open.
