# Dadeto Local Symphony Workflow

This file defines the first local policy surface for the Symphony scaffold in Dadeto.

## Allowed command families

- `bd` for bead selection, comments, closure, and sync
- `git` for add, commit, pull --rebase, push, and status
- `npm test` and `npm run lint` for required quality gates

## Required quality gates

- Run `npm test` before closing a bead that changes code or docs with code-adjacent behavior.
- Run the smallest targeted validation command for the touched local Symphony surface before closure.
- Record exact commands and outcomes in the owning bead.

## Handoff requirements

- Leave operator-visible evidence in `notes/agents/` or tests when the loop changes workflow behavior.
- Record blockers, follow-up scope, and next recommended action in Beads when the loop stays partial.
- Complete `git pull --rebase`, `bd sync`, `git push`, and confirm `git status` is up to date with `origin/main`.
