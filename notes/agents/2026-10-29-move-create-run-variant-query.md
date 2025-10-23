# Move createRunVariantQuery helper

- **Challenge:** Needed to relocate `createRunVariantQuery` into the core module without breaking how the Cloud Function wires the query factory or losing confidence in the Firestore query chain.
- **Resolution:** Exported the helper from the core package, updated the entrypoint to consume it, and added a focused unit test that exercises the orderBy/where/limit/get chain to prove the behavior survived the move.
