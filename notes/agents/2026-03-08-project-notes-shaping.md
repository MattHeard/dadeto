# Agent Retrospective: project notes shaping

- **Unexpected hurdle:** the remaining local changes were not tied to one open bead, so the landing decision depended on whether the project-note edits formed a coherent repo-shaping slice on their own.
- **Diagnosis path:** inspected the diffs in `projects.md`, `projects/symphony/notes.md`, and `projects/core-lint-zero/notes.md`, then checked the ready queue to confirm a real follow-up bead already depended on the new project note.
- **Chosen fix:** landed the project-shaping docs together as one coherent bundle: add `core-lint-zero` as an active project, seed its note, and preserve the Symphony future-consideration note that clarifies how project acceptance may evolve.
- **Next-time guidance:** when creating a new active project, land the project list entry and initial project note in the same loop so later beads do not depend on uncommitted planning context.
