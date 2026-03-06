# Agent Retrospective: quality docs + loop closure linkage

- **Unexpected hurdle:** `bd` CLI required by repo workflow is not installed in this execution environment.
- **Diagnosis path:** Ran `bd prime` and received `command not found`, then proceeded with doc updates while preserving evidence in git/test output.
- **Chosen fix:** Added explicit evaluator and definition-of-done requirements in docs and linked them in `AGENTS.md` loop completion criteria.
- **Next-time guidance:** Install/provision `bd` in the container image so closure evidence can also be recorded in bead comments per policy.
