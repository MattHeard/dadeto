# GCP Test Database ID Fallback

The `gcp-test` run failed in the `render-variant` Cloud Function with a Firestore database mismatch: the runtime tried to read the default database while the ephemeral environment was using `t-39a3371a`.

Diagnosis path:
- Checked the Playwright artifact and Cloud Function logs.
- Confirmed the failure was not just the browser assertion; the backend logged `INVALID_ARGUMENT` from Firestore before the E2E waits failed.
- Traced the wrapper path through `render-support` and the Firestore helpers.

Chosen fix:
- Added a dedicated `DATABASE_ID` environment variable in Terraform.
- Updated Firestore database resolution to prefer `DATABASE_ID` before `FIREBASE_CONFIG`.
- Added regression tests for the explicit env var path.

Next-time guidance:
- For ephemeral GCP environments, keep the database ID on a dedicated env var instead of relying on `FIREBASE_CONFIG` alone.
- When an E2E run fails on a browser assertion, check the Cloud Function logs first to see whether the real fault is upstream.
