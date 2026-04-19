# COZY1 blog.json registration

- **Unexpected hurdle:** The repo workflow references `bd`, but the `bd` CLI is not installed in this container.
- **Diagnosis path:** Ran `bd prime` first to follow loop workflow; shell returned `bd: command not found`.
- **Chosen fix:** Proceeded with the bounded content update by adding the COZY1 post metadata directly to `src/build/blog.json`.
- **Next-time guidance:** Install or document `bd` bootstrap steps in repo setup so loop evidence can be recorded consistently in bead comments.
