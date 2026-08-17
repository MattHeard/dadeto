# Failure Modes: Possession Request

## Initial Predicted Failure Classes
- Missing or blank SKU.
- Coordinates outside WGS84 bounds.
- Non-numeric coordinates.
- Local-time or second-level timestamps instead of UTC minutes.

## Detection Signals
- `valid: false` with stable field-specific errors.
- Focused Jest failure.
- Build manifest missing `POSS1`.

## First-Response Playbook
1. Run the focused Jest command.
2. Compare input with the documented request shape.
3. Add a fixture for any new boundary case.

## Promoted from Real Failures
- Date: 2026-08-17
- Failure observed: None yet.
- Root cause: N/A.
- Fix implemented: Initial toy.
- Guardrail added: Deterministic normalization and error-order tests.
