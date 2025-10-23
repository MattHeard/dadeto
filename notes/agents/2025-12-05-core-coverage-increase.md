# Core coverage increase

- Added regression tests for the API key credit v2 handler to exercise default parameters and the noop error logger. The tricky part was realizing the uncovered branches came from destructured defaults and ternaries.
- Expanded the verifyAdmin suite to hit both the default invalid-token message and the dependency guard clauses. Ensuring the error object lacked a message was necessary to flip the final branch.
- Added a re-export verification test to cover the add-dendrite-page helper modules.
