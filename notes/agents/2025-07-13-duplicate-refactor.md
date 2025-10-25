## Summary
- Identified overlapping object validation helpers in tic tac toe toy and shared dendrite helper module.
- Initial attempt to import shared parser into tic tac toe failed because mutation tests load the toy via a data URL, preventing relative imports.
- Resolved duplication by reusing `isNonNullObject` from `src/core/state.js` inside the dendrite helpers module instead.
