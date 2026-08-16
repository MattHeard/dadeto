# Failure Modes: Object-minute Asset Registry

## Initial Predicted Failure Classes
- Invalid JSON or a missing `assets` array.
- Malformed asset entries.
- Duplicate or unstable asset ordering.

## Detection Signals
- Empty normalized inventory.
- Focused Jest failure.
- Different output for the same input.

## First-Response Playbook
1. Run the focused Jest command.
2. Compare the input shape with the documented contract.
3. Add a fixture for any newly observed normalization rule.

## Promoted from Real Failures
- Date: 2026-08-16
- Failure observed: None yet.
- Root cause: N/A.
- Fix implemented: Initial toy.
- Guardrail added: Focused normalization and determinism tests.
