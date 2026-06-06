## GCP Test Render Variant Dirty Update Rebind

Unexpected hurdle:
- The render-variant Cloud Function still failed in the Playwright run even after the read-side tenant rebinding fixes.
- The remaining failure surfaced as a Firestore write-batch commit error during the dirty-variant cleanup path.

Diagnosis path:
- The Playwright report still failed at `test/e2e/new-story.spec.ts:189`.
- The Cloud Function logs showed `INVALID_ARGUMENT` for `(default)` versus the tenant database.
- The stack trace pointed at `change.after.ref.update(...)` inside `createHandleVariantWrite()`, which still used the snapshot-bound ref directly.

Chosen fix:
- Threaded the tenant `db` into `createHandleVariantWrite()` from `src/core/cloud/render-variant/run.js`.
- Rebuilt the dirty ref from `change.after.ref.path` via `db.doc(path)` before calling `.update(...)`.
- Added regression coverage for both the tenant-bound and no-path fallback branches in `test/core/cloud/render-variant/render-variant-core.test.js`.

Next-time guidance:
- When the logs point to `write-batch.js` or `DocumentReference.update`, look for remaining snapshot-bound write paths, not just reads.
- Coverage can miss these until the fallback branch is explicitly exercised, so add a no-path test when introducing a ref rebind ternary.
