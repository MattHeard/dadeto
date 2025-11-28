## Unexpected hurdle
- Running the full Jest suite produced 100% overall coverage except for `core/cloud/get-moderation-variant/get-moderation-variant-core.js`, which was missing the false branch of the Firestore/auth guards (lines 116/131). The helper functions were only validated when the dependency itself was absent, so the TypeError branches for invalid-but-present objects were never exercised.

## How I addressed it
- Added dedicated unit tests that call `createGetModerationVariantResponder` with an object lacking a `collection` function and another with a non-function `verifyIdToken`. That let Jest hit the remaining paths without touching any of the broader network or Firestore helpers.

## Lessons learned & follow-ups
- Keep an eye on guard clauses for dependency shape validation; a `null` check test may not cover the `'typeof !== "function"'` branch, so add dedicated cases when coverage reports flag the lines.
- Follow-up question: should we audit other `assert*Instance` helpers in `core/cloud` for similar blind spots, or would that be too noisy?
