# Assign moderation Firebase init refactor

- **Context:** Needed to relocate the `ensureFirebaseApp` helper into `index.js` without breaking the Firestore helper's caching behavior.
- **Challenge:** `firestore.js` relied on the helper's module-level state to decide when to reset the Firebase Admin app, so moving the function risked losing shared state.
- **Resolution:** Kept the shared initialization state in `firebaseApp.js`, exposed read/write helpers, and updated `index.js` to own the initialization logic while `firestore.js` now expects callers to provide the ensure function when needed.
