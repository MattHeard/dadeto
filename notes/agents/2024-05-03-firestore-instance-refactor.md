# Firestore instance refactor

## Challenges
- Needed to encapsulate the cached Firestore instance while still preserving the lazy initialization semantics the handler relies on.

## Resolutions
- Introduced a `createGetFirestoreInstance` factory that closes over the cached instance and returns the async accessor, keeping the initialization logic intact without exposing module-level state.
