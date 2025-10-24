# Assign moderation Firebase module merge

- **Challenge:** Removing the dedicated `firebaseApp.js` file risked creating a circular dependency with `firestore.js` when wiring the reset hook.
- **Resolution:** I colocated the initialization handler map in `index.js`, exported the reset helper there, and redirected the Firestore cache reset to consume the new export while ensuring the handler still clears the local flag.
