# THREEFOLD direct passenger rescue

## Unexpected hurdle

The first isolated checkout was created under `/tmp` and the environment removed it while edits were still uncommitted.

## Diagnosis

The temporary worktree had been pruned; its branch metadata remained, but its files did not. The shared user worktree contained unrelated dirty changes and could not safely host implementation.

## Chosen fix

Reattached the feature branch under `/home/matt/.codex/worktrees/threefold-rescue-20261019`. Added a deterministic mooring interaction, passenger/ferry episode state, legacy-save normalization, visible outcomes, and keyboard/gamepad/touch controls. A real movement route from the authored spawn reaches the mooring before surge; focused tests cover both rescue and loss branches.

## Next-time guidance

Use a persistent Codex worktree for uncommitted implementation. Run the focused interaction/save/input suites first, then `npm run check`; treat the matching GitHub `check:full` result as separate evidence before closing the Bead.
