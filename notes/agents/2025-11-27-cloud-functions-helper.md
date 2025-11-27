# Cloud functions packaging

- The Terraform failures came down to two surprises: the Gen1 environment still treated `firebase-functions/v1` as CommonJS (so named exports can't be read) and the per-function core files expected `../cloud-core.js` even though each function lived in a leaf directory after the copy step.
- Added `src/cloud/firebase-functions.js`, which uses `createRequire` to load the runtime bundle and export the resolved value. Every GCF bridge and `process-new-page` now imports that helper so the deployed entry points never directly hit the CommonJS boundary.
- `copy-cloud.js` now stages the helper into `infra/cloud-functions` and plants a root `cloud-core.js`, which gives the shared core modules a stable `../cloud-core.js` target when Terraform zips each function. Running `npm run build:cloud` confirmed the helper and root core file arrive where Terraform expects, then I deleted the generated browser helpers (per earlier notes) so the tree stays tidy.

**Learnings / follow-ups**
1. The cloud build script is the place to keep deployment copies in sync, so new shared helpers should always be surfaced there once their sources move under `src/cloud`.
2. Removing the temporary infra browser helpers after running `npm run build:cloud` remains necessary to avoid noise in `git status`.

**Open questions**
- Would it make sense to run `npm run build:cloud` automatically (or at least in CI) before Terraform apply so the helper and core copies are always fresh?
