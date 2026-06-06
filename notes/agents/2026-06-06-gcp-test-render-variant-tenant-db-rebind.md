# GCP test render-variant tenant db rebind

- Unexpected hurdle: the latest `gcp-test` failure was still an `INVALID_ARGUMENT` Firestore mismatch, but this time it came from the render-variant path instead of Firestore initialization.
- Diagnosis path: I reproduced the failure from the Cloud Function logs, then traced `src/core/cloud/render-variant/render-variant-core.js` for snapshot-derived refs that still called `.get()` or `.collection()` directly. The risky paths were the variant snapshot page lookup, option loading, and alt-page lookup.
- Chosen fix: rebind snapshot-derived document refs through the injected tenant `db` before dereferencing them, and update the renderer tests to prove the code uses `db.doc(path)` rather than the original event ref chain.
- Next-time guidance: when a Cloud Function test fails with a database mismatch, check every snapshot-derived ref in the handler, not just the top-level app setup.
