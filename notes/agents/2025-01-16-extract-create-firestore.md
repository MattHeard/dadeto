# Extract createFirestore helper to core

- **Challenge:** Needed to align the get API key credit function with the shared core helpers without changing runtime behavior.
- **Resolution:** Moved the Firestore factory into the core layer and re-exported it from the cloud wrapper, matching the structure used by other functions.
