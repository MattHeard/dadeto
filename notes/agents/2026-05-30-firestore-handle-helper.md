# Firestore Handle Helper

- Unexpected hurdle: the cloud entrypoint rename left some wrappers exporting helper handlers that were no longer needed outside the module.
- Diagnosis path: `update-variant-visibility` was the smallest Firestore-triggered entrypoint that still built its handler directly in `src/cloud`.
- Chosen fix: added `createFirestoreHandle` in `src/core/cloud/firestore-handle.js`, which receives injected `functions`, `getFirestoreInstance`, trigger metadata, and a handler factory, then returns the registered cloud handle.
- Follow-up refinement: moved the update-variant-visibility trigger metadata and handler factory composition into `createUpdateVariantVisibilityHandle(functions, getFirestoreInstance)`, leaving the cloud wrapper as a dependency-only call site.
- Next-time guidance: use this helper for small Firestore-triggered wrappers before adding custom registration code in `src/cloud/**/index.js`; keep test imports pointed at core handler factories rather than cloud entrypoint internals.
