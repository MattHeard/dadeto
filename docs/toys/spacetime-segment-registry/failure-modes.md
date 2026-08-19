# Failure Modes: Spacetime Segment Registry

## Initial Predicted Failure Classes
- Missing segment or point identifiers.
- Accidental reversal of start and end references.
- Accidental addition of routing or domain-specific fields.

## First-Response Playbook
1. Run the focused Jest command.
2. Confirm start/end values match the input order.
3. Confirm the toy remains a pure segment-reference normalizer.
