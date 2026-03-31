# 2026-03-31 two-more globs branch-100 follow-up

- **Unexpected hurdle:** Re-enabling `src/core/local/symphony.js` and toy `joyConMapper` immediately exposed a few fallback-only branches that existing tests never touched.
- **Diagnosis path:** Removed two ignore globs, reran coverage, then used `coverage-final.json` branch maps to identify precise branch IDs/lines still uncovered.
- **Chosen fix:** Added focused tests for `joyConMapperToy` action/state paths and extra Symphony fallback-event scenarios, and simplified one Symphony event-message normalization branch to avoid dead conditional logic.
- **Next-time guidance:** For near-covered files, branch-map guided tests + tiny branch simplifications are faster than broad refactors.
