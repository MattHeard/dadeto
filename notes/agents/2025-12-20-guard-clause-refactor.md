# Guard Clause Predicate Extraction

- **Challenge:** Extracting the `!doc.exists` guard into a helper without inadvertently changing the handler's return semantics or the surrounding Firestore initialization logic.
- **Resolution:** Introduced a dedicated `isMissingDocument` helper that mirrors the original predicate and replaced the inline condition, keeping the handler flow intact.
