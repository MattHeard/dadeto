# Failure Modes: Spacetime Point Registry

## Initial Predicted Failure Classes
- Missing or duplicate-looking point IDs.
- Coordinates outside WGS84 bounds.
- Invalid or non-minute UTC timestamps.
- Accidental persistence or rental-domain coupling.

## First-Response Playbook
1. Run the focused Jest command.
2. Compare values with POSS1 coordinate/time semantics.
3. Confirm the toy remains a pure normalizer with no environment argument.
