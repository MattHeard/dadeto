# Cloud functions helper packaging

- Terraform kept raising `ERR_MODULE_NOT_FOUND: /firebase-functions.js` for every Gen1 function because the entry points still imported the helper from `../firebase-functions.js`, but each TF zip only contains the leaves under `cloud-functions/<function>` so `../` pointed entirely outside the archive and the helper never shipped.
- I confirmed the helper only lives at `infra/cloud-functions/firebase-functions.js` after the copy step, so the solution was to stage a copy of `firebase-functions.js` inside every function directory and switch those modules (and `process-new-page/index.js`) to import it from `./firebase-functions.js`.
- With the helper colocated, each deployment zip now contains a local helper and the imports no longer try to climb above the archive root, which should resolve the `ERR_MODULE_NOT_FOUND` Terraform failures.

**Learnings / follow-ups**
1. Shared helpers that every function relies on must be copied into the leaf directory that Terraform zips; relative imports that reach upward won't survive the GCF packaging.
2. The cloud build script is the right place to add these copies so the terraform artifacts reflect the files under `src/cloud` without manual sync.

**Open questions**
- Should we add a lightweight validation (perhaps an `npm run build:cloud -- --dry-run`) that inspects a representative zip to catch missing helper files before Terraform apply?
