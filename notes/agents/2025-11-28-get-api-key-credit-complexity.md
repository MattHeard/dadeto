# Decomposing API key credit complexity

- *Unexpected hurdle*: Each helper I added to split the branching logic tripped its own `complexity` score, so even after swapping the `if` statements around in `get-api-key-credit-v2-core.js` the lint report still flagged the same functions.
- *Diagnosis & fix*: I simplified `matchPathUuid`, `extractUuid`, and `createFetchCredit` by introducing single-purpose helpers (`sanitizeMatchUuid`, `resolveFirstValue`, `getCreditFromSnapshot`) and kept the new dependency/response wiring inside small helpers (`resolveRequestValidationError`, `resolveRequestResponse`, `resolveV2HandlerDependencies`, etc.) so every exported function stays at or below the cyclomatic limit.
- *Lesson for future agents*: When a lint rule keeps tripping even after refactors, split the conditional logic into helpers until every helper only carries one branch; this keeps each function’s complexity measurable and the overall code more readable.

Open questions:
- Do we plan to raise the `complexity` threshold or batch-resolve the remaining `src/core` warnings, or should future iterations continue feature-by-feature like this?
