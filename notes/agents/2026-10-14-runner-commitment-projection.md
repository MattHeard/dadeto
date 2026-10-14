# Runner commitment projection loop

- Unexpected hurdle: the source collections have no production write owner in this repository, and the initial `listForRunner` query read records from multiple collections.
- Diagnosis: repository search and infrastructure docs showed the search function is read-only; therefore switching the reader alone would point at an unmaintained projection.
- Chosen fix: make Firestore write triggers the projection owner for assignment, segment, and point changes; refresh affected projections transactionally; add idempotent backfill; keep rollout disabled by default and retain the canonical reader until deployment and backfill evidence exist.
- Nightly benchmark: run Playwright on the canonical reader, enable the projection in the ephemeral GCP test environment afterward, seed 100 assignments, explicitly backfill them, and label the latency artifact with its read model and processed count.
- GCP hurdle: the first live `gcp-test` deployment reached fixture seeding, then failed because `scripts/gcp-test-fixture.js` omitted the required `saveRenderedPage` dependency; the projection measurement was therefore skipped.
- Diagnosis/fix: followed the stack to `createRenderContents` and extracted its Cloud Storage adapter into `save-rendered-page.js`, shared by the production GCF adapter and the GCP fixture. This avoids two implementations and ensures seeded pages use production save semantics.
- Verification: focused fixture/adapter tests passed (8/8); `npm run build:cloud` passed; `npm run check` passed all 10 gates, including local E2E; `terraform fmt -check infra/functions-object-minute-rental-search.tf infra/variables.tf` passed. Terraform validate in the live workflow passed before fixture seeding.
- Next: push the fixture repair, rerun `gcp-test`, and verify deployed projection p50/p95 artifact. Do not mark the Notion specification complete before that evidence exists.
- Next-time guidance: establish source write ownership before changing query reads; use deterministic 1/100 fixtures and keep semantic tests separate from work-budget tests.
