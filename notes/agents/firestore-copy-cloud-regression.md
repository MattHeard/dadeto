# Firestore Copy Regression

Unexpected hurdle: `gcp-test` failed in Terraform because the generated Cloud Function bundle loaded `core/cloud/firestore.js` from a copied `firestore-helpers.js` file instead of the real `createFirestoreModule` export.

Diagnosis path: I traced the runtime error back to `src/core/build/copy-cloud.js`, then confirmed the bundle was renaming `firestore-helpers.js` to `firestore.js` in the shared utility copy plan.

Chosen fix: stop renaming `firestore-helpers.js`; let the bundle keep `firestore-helpers.js` distinct so the preserved `src/core/cloud/firestore.js` copy is not overwritten.

Next time: when a generated bundle fails at module load, check for copy-plan collisions before changing the source module itself.
