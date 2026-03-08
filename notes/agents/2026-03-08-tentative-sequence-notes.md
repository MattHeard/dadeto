# 2026-03-08: keep tentative sequences in notes before bead creation

- Scope: land the existing documentation-only worktree changes that steer queue shaping toward project notes instead of speculative bead creation.
- Included changes:
  - `docs/loop/two-agent-model.md` now tells the orchestrator to keep likely future slices in project notes first and only promote stable next work into beads.
  - `projects/core-lint-zero/notes.md` now carries the likely cleanup order as a tentative sequence instead of requiring a prebuilt bead queue.
- Why:
  - this keeps runner work focused on the current ready slice
  - it avoids stale speculative beads when the repo changes after each cleanup loop
- Validation:
  - `npm test`
