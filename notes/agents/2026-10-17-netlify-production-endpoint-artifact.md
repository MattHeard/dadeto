# Netlify production endpoint artifact resolution

- **Unexpected hurdle:** The complete `npm run check` exceeds its default 30-minute test timeout while serial coverage shards are still running. Jest discovery also reports existing duplicate package-name warnings in two Cloud Function directories.
- **Diagnosis:** The workflow's focused tests passed, and the non-test aggregate gates passed after adding JSDoc to the test helper. A heartbeat run showed each full-coverage shard passing, while the outer check wrapper timed out before the coverage run finished.
- **Chosen fix:** Resolve the production search endpoint from a validated `gcp-prod` run artifact for push and manual dispatch, with local tests covering run selection and all failure conditions. For long aggregate checks, set `DADETO_CHECK_TIMEOUT_MS` explicitly and keep progress output visible.
- **Next-time guidance:** Do not infer completion from the coverage summary alone; capture terminal `npm run check` evidence. The Notion specification also requires a live successful production deployment and a failure-path run; perform those only as separately authorized operations.
