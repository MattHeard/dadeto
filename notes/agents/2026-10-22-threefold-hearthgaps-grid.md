# Hearthgaps logical-grid renderer

- Unexpected hurdle: the first changed-core run passed all related suites but left overflow and omission branches uncovered; removing unreachable missing-entity guards then surfaced JSDoc nullability and inferred scene-union types.
- Diagnosis: inspect Istanbul's exact uncovered lines, distinguish impossible missing-layout states from real finite-viewport overflow, and let TypeScript identify where the Hearthgaps scene's narrow inferred type differs from its authored runtime data.
- Chosen fix: exercise home, control, resident, culvert, and Mara overflow in one immutable fixture; remove redundant guards from invariant-only helpers; type layout facets and projected entities explicitly; assert every rendered entity sprite lies within its projected cell bounds and every runoff tile remains inside the culvert.
- Next time: make evaluator coverage paths explicit before adding defensive branches, preserve source scene state in overflow fixtures, and keep route geometry separate from hydraulic/runoff outcomes. Grainlands and Weftways still need renderer integration.
