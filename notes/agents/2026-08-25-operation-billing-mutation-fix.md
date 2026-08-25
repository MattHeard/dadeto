# Operation billing mutation scan

- Unexpected hurdle: seven validation mutants caused runtime errors during test setup rather than ordinary surviving results.
- Diagnosis: the focused scan killed 26 mutants, ignored 2, and reported 7 runtime errors from mutations that invalidated required reservation inputs; no mutants survived or timed out.
- Fix: retained the strict reservation validation and documented those invalid-mutation runtime errors as static boundary outcomes.
- Next time: distinguish mutation-induced setup/runtime failures from behavioral survivors in the terminal report.
