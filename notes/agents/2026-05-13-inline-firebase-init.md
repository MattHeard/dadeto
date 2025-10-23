# Inline Firebase initialization for assign moderation

- **Challenge:** Needed to inline `initializeFirebaseAppResources` into the Cloud Function entrypoint without breaking the existing initialization order for Firestore and Auth.
- **Resolution:** Imported `ensureFirebaseApp`, `getFirestoreInstance`, and `getAuth` directly in `index.js`, recreated the initialization flow there, and removed the redundant helper from `gcf.js`.
