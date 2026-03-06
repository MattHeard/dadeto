# Agent retrospective: docs bootstrap

- **Unexpected hurdle:** Required `bd` workflow command was unavailable in the container (`bd: command not found`).
- **Diagnosis path:** Ran `bd prime` first per repo instructions, confirmed command absence, then continued with direct repo edits and captured the deviation.
- **Chosen fix:** Seeded operational docs under `docs/` to encode loop/evidence/failure guidance directly in-repo.
- **Next-time guidance:** Add a lightweight setup note or fallback script for `bd` so agents can satisfy tracking workflow without command availability risk.
