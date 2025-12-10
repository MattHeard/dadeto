## Reflection 2025-12-18

- Noticed the generated `public/core/cloud/http-core.js` still existed even though `createResponse` now lives in `src/core/cloud/cloud-core.js`, so I removed the stale artifact and regenerated the builds to keep both browser and infra outputs aligned.
- Reran lint, Jest with coverage, duplication, and both `npm run build`/{`build:cloud`} after the cleanup to ensure the helpers and exports stayed consistent with the shared core layer and the removal didn’t break imports.
- Learned that the build scripts eagerly copy everything under `src/cloud`/`src/core/cloud`, so removing a helper still requires explicitly deleting the generated file and re-running the copy step.

Open questions/follow-ups:
- Should we consider folding any other one-off helpers (like bespoke HTTP helpers) into `cloud-core.js` so future duplication reports stay small?
