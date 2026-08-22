# Coverage 100% without exceptions

- Unexpected hurdle: moving the mutant scanner into `src/core` made its operational code part of the coverage corpus and dropped branch coverage to 98.902%.
- Diagnosis: the coverage report identified the scanner relocation as the new uncovered source; dependency-cruiser also rejected a local wrapper importing from top-level `scripts/`.
- Chosen fix: keep the scanner in `scripts/` and make the thin local entrypoint launch it as a child process. This keeps operational tooling outside the covered core without adding coverage exclusions or Istanbul pragmas, while satisfying dependency-cruiser and non-core-thin.
- Next-time guidance: after structural moves, run the authoritative full coverage command before the full check so newly included tooling is detected early.
