# Ledger ingest invalid row

- **Unexpected hurdle:** There was no existing fixture or docs explicitly covering invalid-row reporting, so I had to infer the structured error contract from the bead description.
- **Diagnosis path:** Reviewed `src/core/browser/toys/2026-03-13/ledger-ingest/core.js`, the current fixtures/tests, and the project notes to understand what counts as a core-level failure and whether the summary/outputs already exposed errors.
- **Chosen fix:** Added required-field validation that collects `InvalidRowReport`s, extended the fixtures/tests/spec to cover the new invalid-row scenario, and updated the pure core to skip malformed rows while recording structured errors and counts.
- **Next time:** If we surface more invalid-row heuristics, tighten the helper to enumerate which canonical fields are configurable vs. required and document the schema in the gov spec.
