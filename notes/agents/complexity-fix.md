# Complexity Helper Extraction

Running the requested `npm run lint` after fixing `src/core/cloud/cloud-core.js` confirmed that the only remaining warnings still live outside `src/core` (the new helper logic resolves the `getAuthHeader` complexity alert). I reduced `getAuthHeader` to a single return by moving the getter detection into `resolveAuthorizationHeader`/`callAuthorizationGetter` and kept the `normalizeAuthorizationValue` guard beside it so all conditional checks live in helpers rather than the exported function.

Tests continue to pass and coverage stayed at 100% statements/functions when rerunning `npm test -- --runInBand` (see `reports/coverage/coverage-final.json`).

Open questions: Should additional helpers be introduced for the other higher-complexity cloud helpers (e.g., `createRenderContents`) or can we accept the remaining warnings as part of the existing architecture?
