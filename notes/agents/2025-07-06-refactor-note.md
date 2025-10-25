## Summary

- Identified that `isBooleanType` duplicated the logic already provided by `isType` in `src/core/validation.js`.
- Refactored `isBooleanType` to delegate to `isType` and ran the full Jest suite to confirm the change preserved behaviour.
