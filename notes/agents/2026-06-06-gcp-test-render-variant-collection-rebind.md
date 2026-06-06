## GCP Test Render Variant Collection Rebind

Unexpected hurdle:
- `gcp-test` was still failing in `new-story`, but the remaining Firestore mismatch was not coming from the page or story ref path.
- The `render-variant` flow was still using a snapshot-bound collection ref for `variants`, which kept the default database binding alive during `saveAltsHtml()`.

Diagnosis path:
- The Playwright job logs showed `pendingResponse.ok()` failing in `test/e2e/new-story.spec.ts`.
- Cloud Function logs still reported `INVALID_ARGUMENT` for `(default)` versus the tenant database.
- The page/story ref rebinding fixes were already in place, so I traced the remaining path to `variantRef.parent` inside `saveAltsHtml()`.

Chosen fix:
- Added `rebindTenantCollectionRef(ref, db)` in `src/core/cloud/render-variant/render-variant-core.js`.
- Rebound `variantRef.parent` through `db.collection(ref.path)` before calling `.get()`.
- Added regression coverage in `test/core/cloud/render-variant/render-variant-core.test.js` for the collection rebind and the null-ref guard.

Next-time guidance:
- When a Firestore mismatch persists after document-ref rebinding, check collection refs as well.
- A snapshot can carry one last default-db binding through `parent` even if the document path itself is rehydrated correctly.
