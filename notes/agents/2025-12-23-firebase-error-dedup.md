## Reflection 2025-12-23

- While cleaning duplication detection alerts, I noticed the Firebase app init guard living in `src/cloud/common-gcf.js` duplicated the same `already exists` logic that the Cloud core exposes. Instead of reimplementing it, I wired that module (and the assign‑moderation job handler) to `isDuplicateAppError`, which centralizes the check and keeps the handling consistent when we ignore duplicate initializations.
- Reusing the shared helper also let me shrink `assign-moderation-job/index.js`’s `ensureFirebaseApp` guard down to a one‑line catch block; there were no build surprises, but it reinforced how easy it is to miss redundant code when it only resides inside `try/catch` helpers.
- Follow-up: keep an eye on other places where Firebase initialization is repeated (e.g., any copy of `createFirebaseAppManager`) and consider adding a lint or duplication signpost so future agents remember to reuse the shared `isDuplicateAppError`.

Open questions: 
- Should we export a broader Firebase initialization helper from `src/core/cloud/cloud-core.js` so more of the cloud functions can rely on shared lifecycle state?
