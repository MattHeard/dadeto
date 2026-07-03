Unexpected hurdle: the first targeted test command (`npm test -- --runInBand test/scripts/gcp-prod-workflow.test.js`) routed the file path into the E2E wrapper and returned "No tests found."

Diagnosis path: I verified the workflow file directly, then ran the Jest file with `npx jest --runInBand test/scripts/gcp-prod-workflow.test.js` to isolate the intended assertion.

Chosen fix: updated `.github/workflows/gcp-prod.yml` to point `TF_VAR_database_id` at `production-restore-2026-07-01-08-59`.

Next-time guidance: for workflow-selection checks in this repo, run the specific Jest file directly instead of the top-level `npm test` wrapper when you need a narrow assertion.
