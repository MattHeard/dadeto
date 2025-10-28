## Firestore handler extraction

- **Challenge:** Refactoring the Firestore cache logic risked leaving shared state at module scope, which could change initialization semantics if not carefully preserved.
- **Resolution:** Wrapped the cache inside a factory that accepts the initialization handlers so cached state remains localized while exposing the same public API through destructuring.
