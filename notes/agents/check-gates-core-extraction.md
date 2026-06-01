# Check Gates Core Extraction

- Unexpected hurdle: fixing the non-core extraction left the focused gates failing in sequence rather than all for one root cause.
- Diagnosis path: ran each requested gate independently, used coverage JSON for the unnamed Jest coverage misses, and reran the affected supporting gates after each refactor.
- Chosen fix: restored analyzer and Symphony coverage, extracted duplicated parser/run-id helpers, documented and split extracted helpers for lint, and tightened JSDoc types at dynamic adapter boundaries for `tsdoc:check`.
- Next-time guidance: when moving logic into `src/core`, add JSDoc typedefs for dynamic AST/status shapes immediately and annotate empty arrays before `tsdoc:check` infers `never[]`.
