# Init admin decomposition

- Unexpected hurdle: the public `initAdmin` setup combines validations, shared runtime creation, command bindings, author regeneration, sign-out, and auth initialization, while preserving observable listener order.
- Diagnosis path: the parameter-bag arity diagnostic reported effective arity 8 for `initAdmin`; a focused author-regeneration test through the direct core function was needed because the shared fixture replaces the permission boundary.
- Chosen fix: keep the cohesive exported options object and split runtime creation, command-handler creation/binding, author regeneration, and authentication setup into named helpers. Preserve the existing validation and listener sequence and verify the real boundary forwards `AllowEffects` as the first fetch argument.
- Next-time guidance: run the same targeted arity scan after each decomposition. `initAdmin` is now below the limit; `initAdminApp` remains the next finding in this file. Continue the existing baseline rollout bead without adding suppressions.
