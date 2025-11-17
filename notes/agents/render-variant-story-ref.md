# Story ref helper

- Unexpected: while keeping `resolveStoryMetadata` focused I realized `pageSnap.ref.parent.parent` was spread inside the function, so I pulled that logic into `extractStoryRef` and documented it for future readers.
- Diagnosis: the new helper guards for missing parents, returning `null` when the snapshot isn’t wired to a story document, and `resolveStoryMetadata` now bails out early in that case before touching Firestore.
- Learning: small helpers can tighten the surface area around complex handlers; when refactoring extraction logic, double-check that consumer args (page snapshots or mocks) still chain off `.ref.parent.parent` when being replayed in tests.
- Follow-up idea: consider reusing `extractStoryRef` in other render helpers or core modules so we can catch missing references consistently.
