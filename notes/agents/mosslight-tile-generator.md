# Mosslight background tile generator

- **Unexpected hurdle:** The two renderer outputs represent the same rectangles with slightly different record shapes (`type: rect` exists only in the embedded payload).
- **Diagnosis:** The parity test compared presenter metadata rather than the shared geometry/color that the canvas actually paints.
- **Fix:** Generate deterministic, coordinate-seeded region motifs in one pure module, use its rectangles in both renderers, and normalize test records to geometry/color before comparing.
- **Next time:** Keep art generation pure and stable in world coordinates; test the visual primitives shared across presenters instead of adapter-specific metadata.
