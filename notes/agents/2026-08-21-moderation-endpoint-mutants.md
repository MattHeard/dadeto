# Moderation endpoint mutation hardening

- Unexpected hurdle: the full `mutant:find` scan hit sandbox port and child-process restrictions, and some focused worktree runs omitted uncommitted tests.
- Diagnosis: the current-worktree Stryker report identified only non-callable-loader fallback mutants initially; after that was covered, the remaining reported survivors were `static: true` constants ignored by the repository configuration.
- Fix: added an independent-literal regression test for a non-function static-config loader and verified 44 mutants with zero non-static survivors.
- Next time: use direct current-worktree Stryker for uncommitted mutation-test edits; use the worktree runner after committing or when testing committed state.
