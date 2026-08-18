# Failure Modes: Runner Availability Registry

## Initial Predicted Failure Classes
- Invalid JSON or a missing `runners` array.
- Malformed runner or availability-window entries.
- Unstable runner ordering.

## Detection Signals
- Empty or unexpectedly reordered registry output.
- Focused Jest failure.

## First-Response Playbook
1. Run the focused Jest command.
2. Compare the payload with the documented registry contract.
3. Add a fixture for any newly observed normalization rule.
