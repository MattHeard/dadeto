# Inline Firestore helper for generate stats

- **Challenge:** Needed to expose `getFirestoreInstance` inside the `generate-stats` entrypoint so it could share the locally
  scoped Firebase initialization helper.
- **Resolution:** Duplicated the Firestore resolver logic within `index.js`, ensuring the Cloud Function reuses the cached
  instance while respecting custom database IDs.
