# 2026-05-30 non-core wrapper policy

- Unexpected hurdle: applying the new wrapper-shape rule to every `src/cloud/**` file produced noise from support modules that are not deployable entrypoints.
- Diagnosis path: ran the focused non-core-thin tests, then the full non-core-thin gate, and compared the violation count before and after narrowing cloud enforcement.
- Chosen fix: added a separate wrapper-violation bucket for `src/cloud/**/index.js`, `src/browser/**`, `src/build/**`, `src/local/**`, and `src/scripts/**`; the gate accepts wrappers that declare `handle` from a factory and either export or invoke it.
- Next-time guidance: keep non-core policy checks scoped to executable adapter surfaces first, then widen only after the target directory has a consistent wrapper convention.
