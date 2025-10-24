# Assign moderation Firestore copy

- **Challenge:** Needed to inline the shared Firestore helper into the assign moderation job package without breaking relative imports.
- **Resolution:** Mirrored the shared module's implementation while keeping the local `firebaseApp` dependency path consistent.
