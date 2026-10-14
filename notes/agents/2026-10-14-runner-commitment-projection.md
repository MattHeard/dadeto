# Runner commitment projection loop

- Unexpected hurdle: the source collections have no production write owner in this repository, and the initial `listForRunner` query read records from multiple collections.
- Diagnosis: repository search and infrastructure docs showed the search function is read-only; therefore switching the reader alone would point at an unmaintained projection.
- Chosen fix: make Firestore write triggers the projection owner for assignment, segment, and point changes; refresh affected projections transactionally; add idempotent backfill; keep rollout disabled by default and retain the canonical reader until deployment and backfill evidence exist.
- Nightly benchmark: run Playwright on the canonical reader, enable the projection in the ephemeral GCP test environment afterward, seed 100 assignments, explicitly backfill them, and label the latency artifact with its read model and processed count.
- Verification: `npm run check` passed all 10 gates, including local E2E; `npm run build:cloud` completed successfully. `terraform fmt -check infra/functions-object-minute-rental-search.tf infra/variables.tf` passed; local Terraform validation is unavailable because the repository wrapper allows formatting only.
- Next: run the GCP workflow and verify its deployed projection latency artifact. Do not mark the Notion specification complete before deployed p50/p95 evidence exists.
- Next-time guidance: establish source write ownership before changing query reads; use deterministic 1/100 fixtures and keep semantic tests separate from work-budget tests.
