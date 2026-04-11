# get-api-key-credit mutant cleanup

## Context

We reviewed the surviving mutants in `src/core/cloud/get-api-key-credit/get-api-key-credit-core.js` and decided to remove redundant contract noise instead of overfitting tests.

## Changes

- Simplified `isValidUuid(uuid)` to rely on `isValidString(uuid)` directly.
- Removed the redundant numeric guard from `resolveSpecialCreditMapping(credit)`.
- Added a constructor-name assertion test for `createFirestore(null)` so the Firestore constructor label stays covered.

## Validation

- `npm test` passed.
- Result: `491/491` suites and `2482/2482` tests passed.

## Takeaway

- If a branch is redundant under the current contract, prefer removing it rather than preserving it for mutation coverage.
- If an error message carries contract value, add a focused assertion so the label remains stable.
