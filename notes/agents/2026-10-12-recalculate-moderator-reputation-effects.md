# Recalculate moderator reputation write effects

- **Unexpected hurdle:** Persistence tests lived in the shared-core suite, where the reputation writer directly invoked Firestore `set` methods.
- **Diagnosis:** The scheduled job injected a writer that accepted the raw database and no `AllowEffects` token, and its scheduler callback had no invocation boundary.
- **Fix:** Remove persistence from shared core, make the scheduled job accept and forward `AllowEffects`, move moderator and author writes to a cloud adapter, and mint a fresh token for each scheduled invocation. Keep the moderation-rating query and author existence reads in the query path.
- **Evidence:** Focused Jest passed 5 suites / 15 tests; `npm run tsdoc:check` passed; targeted ESLint passed after formatting; `npm run check` passed all 10 gates, including full coverage, 11/11 local E2E, and 0 clones; `npm run build:cloud` passed; `git diff --check` passed. Four generated infra shims changed by the package build were restored.
- **Next:** Continue the lexicographic `src/cloud` Allow Effects audit at `src/cloud/render-author/index.js`.
