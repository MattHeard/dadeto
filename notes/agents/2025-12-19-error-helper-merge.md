## Reflection 2025-12-19

- The Firebase error helpers living in `src/core/cloud/error-core.js` were duplicated enough to merit relocation, so I moved `isDuplicateAppError`, `extractErrorMessage`, and `hasStringMessage` (plus their private helpers) directly into `cloud-core.js` so every function under `src/core/cloud` can import the shared check from one place.
- Deleted the standalone module from `src/` and `public/`, then rebuilt the browser and cloud functions to ensure no stale `error-core` imports survive and the generated outputs keep referencing `cloud-core.js` instead.
- Reran linting, the full Jest suite, duplication report, and both build scripts to prove the refactor left coverage, formatting, and artifacts clean.

Open questions/follow-ups:
- Should we fold any other tiny helpers (e.g., the `http-core` builder) into `cloud-core.js` instead of keeping isolated modules that risk duplication alerts?
