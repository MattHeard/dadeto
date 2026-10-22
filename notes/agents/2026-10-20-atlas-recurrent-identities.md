# Atlas recurrent component identities

- Unexpected hurdle: the repository's parameter-bag arity lint rejected schema helpers that unpacked five or more identity fields from one object.
- Diagnosis: `repo/no-parameter-bag-arity-smuggling` counts top-level parameter destructuring as effective arguments; local destructuring of transport-only records also triggered it.
- Fix: split component and observation constructors into small domain arguments, keep measured data as a named record with direct field reads, and retain one shared pinned-model schema for V1 and V2. Added strict V2 schemas and deterministic, versioned component, recurrent-position, and observation IDs. The single-record V1 migration emits a component and position with an empty observation list; V1 graph import/export remains unchanged.
- Verification: the changed-core impact check passed 4 suites / 39 tests, ESLint, core parsing, duplication (0 clones), and scoped coverage with no uncovered lines or branches in `src/core/interpretability/index.js`. `npm run check` passed all 10 fast gates. Exact-head GitHub Full Check is pending after push.
- Next-time guidance: keep legacy migration at the individual-record boundary until graph references can be migrated without rewriting persisted evidence. Keep schema tests on the injected test double so they do not require installed Zod.
