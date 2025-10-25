# Audio controls handler refactor

- **Task**: Reduce duplication between the play and pause audio click handlers.
- **Challenge**: Needed to ensure the pause handler preserved existing behavior while delegating to the shared implementation.
- **Resolution**: Reused the play handler factory for pause by passing the pause action, keeping handler signatures intact without altering stop handler logic.
