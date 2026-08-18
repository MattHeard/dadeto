# Failure Modes: Asset Allocation Registry

## Initial Predicted Failure Classes
- Missing possession context or asset identifiers.
- Allocation window omits transport by using possession times as its bounds.
- Accidental direct request references.

## First-Response Playbook
1. Run the focused Jest command.
2. Check that `allocatedFrom` precedes possession and `allocatedTo` follows it.
3. Confirm relationships use `possessionContextId`, not `requestId`.
