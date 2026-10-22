# THREEFOLD Silt Margin packing

- Unexpected hurdle: the shared packer moved an out-of-region dew-pool into a free viewport cell because its projected rectangle collided with an in-region object.
- Diagnosis: packing is appropriate for visible Silt Margin identities, but moving canonically off-region details into the camera would violate the scene's existing culling/overflow behavior.
- Fix: resolve the authored layout first, pack only entities whose canonical projected cells are inside the Silt Margin viewport, then retain off-region entries and overflow records from the unmodified resolution. The packed display positions remain separate from simulation geometry; water continues to use solver state.
- Verification: focused Silt Margin tests passed 1 suite / 20 tests. The changed-core evaluator passed 38 related suites / 572 tests with 100% statements, branches, functions, and lines for the covered logical-grid and renderer files, plus clean ESLint/core parsing and zero clones. Whole-repository check, build, manuals, and exact-head CI remain pending.
- Next-time guidance: specialized scene packing must preserve each scene's explicit viewport culling, water, actor, hierarchy, and interaction contracts; do not assume the generic packer's out-of-bounds policy is correct for every region.
