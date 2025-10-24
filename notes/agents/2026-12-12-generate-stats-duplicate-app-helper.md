# Generate stats duplicate app helper

- **Challenge:** Needed to reuse duplicate app detection logic while keeping existing behaviour intact during Firebase initialization.
- **Resolution:** Extracted the condition into a dedicated `isDuplicateAppError` helper and verified it mirrors the previous boolean guard before reusing it inside `ensureFirebaseApp`.
