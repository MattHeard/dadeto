# Allow Effects source-cloud audit: assignment imports and page processing

## Unexpected hurdle

The active Notion specification describes `resolveFirestoreEnvironment` and `shouldUseCustomFirestoreDependencies` as the remaining imports in the assign-moderation-job review. Their implementation is pure selection/comparison logic. The core composition already places middleware, CORS registration, route registration, assignment persistence, response writes, Firebase initialization, and diagnostics behind permission-first adapters.

## Diagnosis

- `src/core/cloud/assign-moderation-job/assign-moderation-job-core.js`: `resolveFirestoreEnvironment` returns an explicit override or reads through its injected getter; `shouldUseCustomFirestoreDependencies` compares injected function identities and override presence. Neither performs a command-style effect.
- `src/core/cloud/assign-moderation-job/index.js`: `createSetModeratorAssignment` provides the assignment writer; core orchestration receives the permission-aware writer callback rather than a Firestore database for the command.
- `src/core/cloud/process-new-page/process-new-page-core.js`: the startup Firestore token is already kept out of the trigger closure, but trigger-time writes remain. `markSubmissionProcessed` directly calls `DocumentReference.update`; the normal creation path queues `WriteBatch.set/update` and calls `WriteBatch.commit`.
- `src/cloud/process-new-page/index.js`: startup adapter coverage exists, but the public Firestore trigger currently invokes the core handler without a trigger-time effects boundary.

## Chosen next step

Treat the process-new-page trigger-time writes as concrete remaining Allow Effects work. Start with the direct processed-marker update, or a coherent adapter that covers it and the batch commit path. The capability must be supplied per trigger invocation; never retain the startup capability. Trace the routing chain through `markProcessedIfMissing`, `shouldSkipAndMarkSubmission`, and `createSubmissionContextProcessor` before editing so every call site is included.

## Next-time guidance

Avoid changing only the public trigger wrapper: the existing handler expects the snapshot as its first argument, so an effects boundary requires an explicit core signature change and propagation through the processing call tree. Run JSDoc immediately after propagation to identify all entrypoint and test callers. Keep the query-only Firestore reads separate from the batch/update commands.

## Subsequent audit checkpoint

`src/cloud/get-api-key-credit-v2/index.js` now runs Firebase initialization and Firestore construction inside `createEffectStartupBoundary`; its request handler uses `createEffectHttpBoundary`. The startup initializer is a permission-first adapter. The transaction adapter gates `runTransaction` and transaction `.set` with the request capability; transaction `.get` remains a query. Response header/status/body writes and error logging also require the request capability. The startup token does not enter the request handler. No additional unguarded command was found in this entrypoint. The next lexicographic cloud audit target after it is `src/cloud/get-api-key-credit/index.js`.

`src/cloud/get-api-key-credit/index.js` uses `createEffectHttpBoundary`; both response adapters take the request capability. Its Firestore document `.get()` is a query, while `new Firestore()` constructs the client. The core contains no write, response, or logging operation outside the permission-first response adapters. No command-style bypass was found. The next source-cloud target in lexical order is `src/cloud/get-author-uuid-v2/index.js`, already recorded in the active bead as migrated and verified.
