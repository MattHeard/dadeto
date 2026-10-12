# Render-author startup effects

- **Unexpected hurdle:** The entrypoint delegated startup and Firestore trigger registration to a shared-core composition function, so Firebase initialization and `onWrite` registration were hidden behind functions that did not require `AllowEffects`.
- **Diagnosis:** `runRenderAuthor` resolved Firestore twice at module startup and called the shared `createFirestoreDocumentOnWriteTrigger` helper. Request-time Storage saves and author updates already received fresh invocation permissions.
- **Fix:** Initialize Firebase and resolve Firestore once inside `createEffectStartupBoundary`, then pass the initialized database into core. Move trigger registration to a permission-first cloud adapter. The registered handler still receives a fresh per-invocation permission; the startup permission is not captured.
- **Evidence:** Focused Jest passed 6 suites / 21 tests; `npm run tsdoc:check` passed; targeted ESLint passed; configured `npm run check` passed all 10 gates, including local E2E 11/11 and 0 clones; `npm run build:cloud` passed; generated render-author entrypoint and both new adapters passed `node --check`; `git diff --check` passed. Four generated infra shims changed by cloud packaging were restored.
- **Next:** Continue the lexicographic `src/cloud` Allow Effects audit at `src/cloud/render-variant/index.js`.
