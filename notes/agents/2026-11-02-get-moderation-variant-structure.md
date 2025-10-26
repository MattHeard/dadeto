# get-moderation-variant structure alignment

- **Challenge:** Migrating the get-moderation-variant Cloud Function to the new bridge layout required teasing apart the Express handler so the core responder could be shared between the deployment bundle and tests without reusing direct Firebase Admin imports.
- **Resolution:** Split the responder logic into `get-moderation-variant-core.js`, added the GCF shim, and expanded `copy-cloud.js` so the deployment step includes the core, shared cloud/common shims, and the new bridge files alongside the existing Firestore helper.
