# Production error fix verification

- **Unexpected hurdle:** The production scheduler configuration endpoint denied `cloudscheduler.jobs.get` to the local diagnostic service account, so configuration inspection alone could not establish whether the OIDC deployment worked.
- **Diagnosis path:** Verified the actual scheduled attempt and function execution logs for the Oct 7 UTC run, and probed the browser module URL after the production deploy.
- **Fix evidence:** GitHub `gcp-prod` run `37531043712` completed successfully for commit `5eab18eca7`. The production URL `/core/object-minute-rental-search/search-core.js` returned HTTP 200 and served the expected ESM exports. Cloud Scheduler job `prod-generate-stats-daily` started at `2026-10-07T00:00:01Z` and finished with HTTP 200 at `00:00:09Z`; Cloud Function `prod-generate-stats` logged execution success with status 200 at `00:00:06Z`.
- **Next-time guidance:** When scheduler describe permissions are unavailable, use the execution log and target function log for a real invocation; Terraform apply success by itself does not prove authentication works. Aggregate `npm run check` and jscpd cleanup remain open under `dadeto-7i5q`.
