# Vanta Relay

- Mutant `110` in `src/core/browser/inputHandlers/realHourlyWage.js:191`
- Mutation target: `normalizeFormData(candidate)` guard on `isObjectLike(candidate)`
- Added a direct test in `test/inputHandlers/realHourlyWageHandler.test.js` that asserts `normalizeFormData(null)` returns the default form shape
- Existing string-based fallback coverage was not enough to distinguish the mutation
- The new nullish case is the relevant boundary check for this guard

Status:
- applied
- verified by the full test suite
