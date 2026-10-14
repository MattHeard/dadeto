# Runner commitment projection loop

- Unexpected hurdle: the source collections have no production write owner in this repository, and the initial `listForRunner` query read records from multiple collections.
- Diagnosis: repository search and infrastructure docs showed the search function is read-only; therefore switching the reader alone would point at an unmaintained projection.
- Chosen fix: make Firestore write triggers the projection owner for assignment, segment, and point changes; refresh affected projections transactionally; add idempotent backfill; keep rollout disabled by default and retain the canonical reader until deployment and backfill evidence exist.
- Verification: `npm run check` passed all 10 gates, including local E2E; `npm run build:cloud` completed successfully. Terraform formatting passed earlier; local Terraform validation is unavailable because the repository wrapper allows formatting only.
- Next: deploy the triggers through the approved GitHub workflow, run and verify backfill, then enable the projection and capture nightly latency artifacts. Do not mark the Notion specification complete before those steps.
- Next-time guidance: establish source write ownership before changing query reads; use deterministic 1/100 fixtures and keep semantic tests separate from work-budget tests.
