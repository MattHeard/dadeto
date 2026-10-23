# Atlas Context Snapshot Failure Modes

## Initial Predicted Failure Classes
- Setup/configuration mismatch: caller omits the injected hash adapter.
- Invalid or missing inputs: malformed bounds, cursor windows, mechanism IDs, or graph records.
- Dependency/service unavailable: injected bundle storage rejects or returns invalid bundle JSON.
- Non-deterministic timing or ordering: context item ordering or canonical hashing varies between requests.
- Environment-specific behavior: a service accidentally forwards `AllowEffects` to hashing or pure core code imports a storage SDK.

## Detection Signals
- Error signatures/log lines: `missing-snapshot-hasher`, `invalid-snapshot-digest`, `invalid-snapshot-cursor`, `snapshot-changed`, or `unknown-mechanism`.
- Observable symptoms: duplicated/omitted typed items, unequal snapshot IDs for unchanged content, or a changed source accepted under an old cursor.
- Failing command(s): focused interpretability Jest suites, `npm run check`, and exact-head Full Check.

## First-Response Playbook
1. Reproduce with the graph and exact cursor from the failing test or caller.
2. Verify cursor bounds and snapshot identity before examining page slicing.
3. Check canonicalization and item ordering independently from the injected digest.
4. Confirm `AllowEffects` appears only at bundle storage boundaries.

## Promoted from Real Failures
- Date: 2026-10-23
- Failure observed: first implementation had no snapshot regression tests and accepted windows whose bounds did not match the requested item cap.
- Root cause: the API shape was added before page/window traversal invariants were exercised.
- Fix implemented: validate the window against the current max-item bound and cover stable IDs, source mutation, traversal, error states, and permission forwarding.
- Guardrail added (test/doc/harness): 100%-coverage graph and service tests plus this failure-mode checklist.
