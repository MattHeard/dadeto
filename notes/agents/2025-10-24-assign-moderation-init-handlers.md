# Assign moderation job Firebase handler update

- **Challenge:** Needed to relocate the initialization handler registration without breaking the reset flow that `firestore.js` relies on for clearing cached state.
- **Resolution:** Swapped the exported registration API for a shared handlers object so the index module can register its reset hook directly while `firebaseApp.js` continues to expose the reset helper used in tests.
