# get-api-key-credit-v2 createDb core refactor

## Challenges
- Needed to align the v2 cloud function module structure with the rest of the codebase by relocating the Firestore factory into the core package without breaking existing imports.

## Resolutions
- Moved the factory into `src/core/cloud/get-api-key-credit-v2/create-db.js` and added a cloud-level re-export, updating tests to cover both the shared implementation and the re-export surface.
