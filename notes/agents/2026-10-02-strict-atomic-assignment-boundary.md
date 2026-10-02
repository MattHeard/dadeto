# Strict atomic assignment boundary

Atomic custodian assignment now uses `strictAssignmentBoundary` with `formatCommitFailure` injected as its rejection serializer. Single assignment rejection remains appended/feasible/reason; atomic rejection remains committed/reason. Successful serialized atomic commits pass through unchanged, without running the single-assignment append path. Error normalization and empty-input fallback are shared.

The single-candidate world-line adapter now wraps its candidate once and forwards remaining entry/exit/spatial bounds to the multi-candidate evaluator, which owns optional defaults. Dedicated tests compare outcomes for omitted, undefined and null bounds and verify atomic parse failure prevents calculation or writes.

Use all 2026-08-20 through 2026-08-24 suites for complete shared world-line coverage. The first narrower run passed behaviors but did not reach every multi-candidate branch. When parameterizing bounds arrays in Jest, wrap each row in an object so Jest does not spread the bounds as positional test arguments.

Artifacts: `.tmp/strict-atomic-boundary-tests.log`, `.tmp/strict-atomic-boundary-coverage`, `.tmp/strict-atomic-boundary-static.log`, `.tmp/strict-atomic-boundary-lint.log`. Static evaluation reduced strict-14 clones from 141 to 140 with duplication the only remaining failure. The broader aggregate objective remains tracked in dadeto-aaou.
