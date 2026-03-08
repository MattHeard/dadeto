# Agent Retrospective: joyConMapper complexity hotspots

- **Unexpected hurdle:** the first hotspot refactor removed `readStoredMapperState` from the lint report but left `maybeCapture` just above budget and briefly introduced an unused-constant warning.
- **Diagnosis path:** reran the full lint report after each tiny extraction, checked the exact remaining complexity entries in `reports/lint/lint.txt`, and kept the slice constrained to the two targeted hotspots only.
- **Chosen fix:** split storage parsing into narrower helpers and extracted the `maybeCapture` guard/update path so both targeted hotspot warnings disappeared without broadening into the rest of the file’s complexity backlog.
- **Next-time guidance:** for this lint profile, compound guards can be enough to keep a function above budget, so treat single-condition extraction as a valid final cleanup step instead of reaching for a larger refactor.
