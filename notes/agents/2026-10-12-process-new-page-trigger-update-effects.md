# Process-new-page processed-marker effect boundary

## Unexpected hurdle

The trigger handler previously accepted only a snapshot. Adding an invocation boundary at the cloud entrypoint alone would have shifted the snapshot into the capability argument and broken processing. The direct processed-marker update also occurs through multiple routing branches, including skipped submissions and missing option/page context.

## Diagnosis

The startup Firestore resolver already used a startup-only capability correctly. The remaining direct effect was `DocumentReference.update({ processed: true })` inside `src/core/cloud/process-new-page/process-new-page-core.js`. Normal page creation uses a separate `WriteBatch` flow and remains a follow-up.

## Chosen fix

- The core trigger handler now takes `AllowEffects` as its first invocation argument.
- The permission-first `updateSubmissionDocument` adapter in `src/cloud/process-new-page/effect-adapters.js` performs the processed-marker write.
- The adapter is curried separately from the four existing runtime dependencies, preserving the four-input limit.
- The Cloud Function and local simulator create a fresh invocation capability for each trigger. The startup capability remains limited to startup Firestore resolution.
- Tests prove the permission passed into the core handler reaches the update adapter and the update still writes `{ processed: true }`.

## Evidence

- Focused Jest: 3 suites / 33 tests passed.
- `npm run tsdoc:check`: passed.
- Targeted ESLint: passed.
- Configured `npm run check`: all 10 gates passed; line, statement, function, and branch coverage each 100%; duplication reported 0 clones.
- `npm run build:cloud`: passed. Restored the four generated infra shims rewritten by packaging.

## Next-time guidance

Do not fold this adapter together with the normal batch write flow without tracing all batch set/update sites. The next slice should require and forward the same per-trigger capability through every batch write and commit, while leaving Firestore reads classified as queries. Do not capture the startup token in trigger closures.
