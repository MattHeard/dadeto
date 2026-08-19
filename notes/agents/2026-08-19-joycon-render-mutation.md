# JoyCon render orchestration mutation slice

- Unexpected hurdle: the render body had a surviving block mutant because no helper test invoked the full orchestration path.
- Diagnosis: existing tests covered prompt, metadata, and list rendering separately but did not prove that `render` called them together after refreshing persisted state.
- Chosen fix: exported the existing `render` helper through the test-only surface and added an assertion covering state refresh, prompt/metadata output, and list population.
- Evidence: the targeted Stryker scan for lines 1718-1730 killed 1/1 mutant with 0 survivors and 0 timeouts; the focused Jest suite passed 90 tests, ESLint passed with zero warnings, and the diff check passed.
- Next-time guidance: when a small orchestration body survives as a block mutation, add one behavioral integration assertion at the orchestration boundary.
