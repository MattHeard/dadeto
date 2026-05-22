# GCP test fixture render trigger seeding

- Unexpected hurdle: after local service-account signing fixed token creation, run `26272844035` still failed in `Seed GCP fixture for Playwright` because the setup script called the deployed `mark-variant-dirty` endpoint and received `500 Internal Server Error`.
- Diagnosis path: the failed-step log proved token creation had succeeded and narrowed the failure to the setup-time HTTP dependency. The fixture variants were also missing the queryable `name` field used by variant lookup helpers.
- Chosen fix: seed each mock variant with its `name` and `dirty: true`, then rely on the deployed Firestore `render-variant` trigger to render pages from real datastore writes. Remove the setup-time `mark-variant-dirty` endpoint dependency from the GCP fixture workflow.
- Next-time guidance: keep setup focused on the behavior under test. If an admin helper endpoint is not part of the requested E2E slice, prefer writing a trigger-driving datastore fixture and let the target trigger produce the external artifact.
