# Refactor createFirestore to reuse shared DB constructor
- **Challenge:** Noticed both cloud credit handlers instantiated Firestore constructors in the same way, risking drift between versions.
- **Resolution:** Imported the v2 `createDb` helper into the original get-api-key-credit module so the shared constructor logic lives in one place while keeping the dependency type check.
