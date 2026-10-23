# Dynamic MUD Failure Modes

## Initial Predicted Failure Classes
- Setup/configuration mismatch: missing local Node dependencies.
- Invalid or missing inputs: unsupported AST versions, arbitrary fields, unsafe identifiers, oversized values, malformed worlds, dangling relations.
- Dependency/service unavailable: none; the slice has no external service dependency.
- Non-deterministic timing or ordering: prevented by serial array-order execution and pure interpretation.
- Environment-specific behavior: unusual object prototypes or values that are not JSON-like.

## Detection Signals
- Error signatures/log lines: focused Jest failure, TypeScript/JSDoc error, or changed-core coverage below 100%.
- Observable symptoms: validation rejects input; runtime operation reports a missing/stale reference and returns the original world.
- Failing command(s): focused Jest command, `npm run check`, or `npm run manuals:check`.

## First-Response Playbook
1. Capture the failing command and full output.
2. Determine whether the input contract, interpreter behavior, or local setup caused the failure.
3. Add a focused regression test and preserve transaction rollback semantics.

## Promoted from Real Failures
- Date: 2026-10-23
- Failure observed: initial code patch could not create files because the new source directory did not yet exist.
- Root cause: patch application does not create missing parent directories.
- Fix implemented: create the bounded source/test directories before adding files.
- Guardrail added (test/doc/harness): this harness lists the focused test and all acceptance commands.
