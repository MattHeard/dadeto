# Cloud function core import packaging fix

- Cloud Run deployment failed because the generated function bundles only included the cloud wrappers, so runtime imports like `../../core/cloud/get-api-key-credit/createFirestore.js` resolved to `/core/...` on GCF.
- Added direct copies of the core helpers into each affected function bundle and pointed the moderation variant handler at a local `cors.js` shim to keep imports relative within the archive.
- Verified the updated copier script rewrites the bundles by rerunning `npm run build:cloud` and checking that the generated files no longer contain `../../core` paths.
