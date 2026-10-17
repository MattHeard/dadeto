# Interpretability portable graph export

- Unexpected hurdle: the first full check found three uncovered exporter branches and a JSDoc union narrowing error. The tests also need to keep Zod optional.
- Diagnosis: an empty but valid graph exposed the missing-collection path; the helper's defensive optional-ID handling was unreachable after graph validation, and returning the validator result directly widened its boolean type.
- Fix: export a schema-versioned JSON envelope with records sorted by ID, preserve all six collections, treat omitted collections as empty arrays, and return a narrowed invalid result explicitly. Tests round-trip all graph record types and directed edges.
- Zod boundary: the focused tests pass both with the installed Zod path and with `DADETO_TEST_WITHOUT_ZOD=1`; the checked-in tests do not require Zod.
- Evidence: focused tests passed 2 suites / 18 tests in both modes. `npm run check` passed all 10 gates and 11 local browser checks; coverage was lines 24,517/24,517, statements 25,728/25,728, functions 8,181/8,181, branches 14,017/14,017, skipped 0; duplication reported 0 clones.
- Next time: add import/reconstruction validation as its own loop if the research workflow needs to load exported JSON; keep version migration separate from the V1 portable format.
