# Inline firebaseInitialization.markInitialized

- **Challenge:** Ensure removing the helper function did not affect test utilities that rely on the shared initialization state.
- **Resolution:** Verified the mark helper was used only within `ensureFirebaseApp` and replaced the call with `firebaseInitialization.markInitialized()` directly, leaving reset helpers untouched.
