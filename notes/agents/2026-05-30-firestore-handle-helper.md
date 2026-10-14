# Firestore Handle Helper

- Unexpected hurdle: the cloud entrypoint rename left some wrappers exporting helper handlers that were no longer needed outside the module.
- Diagnosis path: `update-variant-visibility` was the smallest Firestore-triggered entrypoint that still built its handler directly in `src/cloud`.
- Chosen fix: added `createFirestoreHandle` in `src/core/cloud/firestore-handle.js`, which receives injected `functions`, `getFirestoreInstance`, trigger metadata, and a handler factory, then returns the registered cloud handle.
- Follow-up refinement: moved the update-variant-visibility trigger metadata and handler factory composition into `createUpdateVariantVisibilityHandle(functions, getFirestoreInstance)`, leaving the cloud wrapper as a dependency-only call site.
- Follow-up (2026-10-14): the core helper remained exported after the live entrypoint moved to startup adapters. Its direct `.onCreate` call bypassed the AllowEffects boundary. It now requires startup AllowEffects and forwards registration through an injected token-first adapter; the core helper no longer calls the Functions SDK directly.
- Next-time guidance: use the helper only with an explicit startup capability and injected token-first registration adapter; keep test imports pointed at core handler factories rather than cloud entrypoint internals.
