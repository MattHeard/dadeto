# Inline Firebase initialization helper

## Challenges
- Ensuring the helper removal did not impact other call sites inside `src/cloud/assign-moderation-job/index.js`.

## Resolutions
- Verified the helper was only used by `ensureFirebaseApp` and replaced the call with `firebaseInitialization.hasBeenInitialized()` directly before removing the wrapper.
