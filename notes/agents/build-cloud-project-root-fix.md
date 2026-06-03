## Build Cloud Project Root Fix

- **Outcome:** Fixed `src/core/build/copy-cloud.js` so `build:cloud` resolves the repo root correctly and copies `src/core/browser/moderation/authedFetch.js` from the expected source path.
- **Unexpected hurdles & options considered:** The original failure only surfaced in the GCP workflow, but a local `npm run build:cloud` reproduced the same ENOENT immediately. After the root fix, the build also regenerated several tracked `infra/*.js` outputs, which is expected for this copy workflow.
- **Lessons & follow-up ideas:** When a copy workflow derives paths from a nested build module, verify the root calculation with a focused regression test instead of relying on the generated output alone.
- **Open questions:** None.
