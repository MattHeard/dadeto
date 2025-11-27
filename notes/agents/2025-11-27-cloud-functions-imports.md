# Cloud functions imports

- Terraform failed with `Named export 'functions' not found` when the Cloud Functions package tried to load the `firebase-functions/v1` bundle. The module is CommonJS, so the ESM bridge there was trying to read a named `functions` export that does not exist, which is why the deployment reported `Provided module can't be loaded`.
- I switched every GCF bridge and the process-new-page entry point to `import functions from 'firebase-functions/v1'` and re-exported that default. The jest mock needed the same treatment so tests still supply a `functions.region` helper. That resolved the deployment errors in the TF logs.
- Running `npm run build:cloud` generates a copy of the infra helpers (`infra/authedFetch.js`, `infra/*MenuToggle.js`, etc.) and the jest run warns about a haste namespace collision between `src/cloud/runtime-deps/package.json` and one of the generated infra package.json files. To keep git clean I delete the generated infra helpers after verifying the build output—otherwise they appear as untracked noise. The haste warning may stay until someone changes those package names or adds ignore rules.

**Learnings / follow-ups**
1. Always delete the derived `infra/*.js` files after running `npm run build:cloud` unless a future change explicitly wants to keep them checked in.
2. Consider whether the duplicated `dendrite-cloud-functions` package name in `src/cloud/runtime-deps` and `infra/cloud-functions/...` should be renamed or ignored to silence Jest’s haste warning when running the full suite.

**Open questions**
- Is there a longer-term plan to keep the infra copies (and their package.json) in sync with the source, or should we ignore them entirely to avoid haste collisions?
