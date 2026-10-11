# get-moderation-variant AllowEffects audit

- Unexpected hurdle: the entrypoint mixes Firebase initialization, Express response writes, logging, authentication, and Firestore access, so the call boundary alone does not show which operations cross into core.
- Diagnosis: `createGetModerationVariantResponder` injects only `db` and `auth`. Its call tree performs `verifyIdToken` and Firestore `.get()` reads; `db.doc(path)` and `.collection(name)` resolve references. No command method (`set`, `update`, `delete`, or `add`) is called from core. The `initializeApp`, CORS/route registration, HTTP responses, and error logs all stay in `src/cloud/get-moderation-variant/index.js`.
- Chosen fix: no AllowEffects change is needed for this endpoint. Its core-injected functions are queries or reference construction, while command effects remain at the external boundary.
- Next-time guidance: continue the lexicographic `src/cloud/**/index.js` audit with the next endpoint after `get-moderation-variant`, tracing injected call trees to concrete SDK operations before classifying them.
