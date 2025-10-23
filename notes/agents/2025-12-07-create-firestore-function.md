# Firestore Factory Extraction

- **Challenge:** Needed to expose Firestore instantiation for dependency injection while preserving existing behavior.
- **Resolution:** Added a small `createFirestore` helper that accepts the Firestore constructor and returns an instance, keeping the handler initialization unchanged.
