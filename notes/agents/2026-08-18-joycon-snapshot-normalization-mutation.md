# JoyCon snapshot-normalization mutation slice

- Unexpected hurdle: the combined normalization range generated nine mutants and was too slow for a bounded run.
- Diagnosis path: split button and axis normalization; button verification produced eight mutants and axis verification produced one.
- Chosen fix: added strict boolean, numeric-default, and four-decimal rounding assertions.
- Evidence: button Stryker scan killed all 8 mutants; axis scan killed its 1 mutant; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: split normalization helpers by value domain when mutation runs become lengthy.
