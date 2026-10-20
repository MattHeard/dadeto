# THREEFOLD Silt Margin retrospective

- **Unexpected hurdle:** Silt Margin needed a distinct schema-v1 save branch while Broken Gate already migrates older schema-v1 saves. Reusing the generic legacy branch based only on the schema number would misread Silt Margin data.
- **Diagnosis:** The scene discriminator and existing save-normalization flow were traced through serialization, import, and per-scene storage keys; regression cases were added for isolated stores and invalid branch combinations.
- **Chosen fix:** Added an explicit Silt Margin state to the typed scene union and save codec, with its own storage key and scene branch. Reused the Mosslight 160 × 144 renderer and shared movement/time/reach helpers, then verified every rendered shape is grid-aligned while physical coordinates remain continuous.
- **Next-time guidance:** When adding another THREEFOLD scene, extend the discriminated scene state and save tests together; test legacy migration collisions, independent storage keys, and renderer grid invariants before running the full quality gate.
