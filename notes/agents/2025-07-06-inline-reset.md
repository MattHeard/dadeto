# Inline reset handler

- **Challenge:** Needed to inline the `resetFirebaseInitializationState` wrapper without breaking the manual override hook used in tests.
- **Resolution:** Removed the wrapper function and updated the cache reset helper to call `firebaseInitializationHandlers.reset()` directly.
