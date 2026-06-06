# gcp-test render-variant story ref rebind

Unexpected hurdle:
- The render-variant fix that rebounded page and variant refs still left `resolveStoryMetadata()` walking `pageSnap.ref.parent.parent` directly.

Diagnosis path:
- Cloud Function logs for `gcp-test` run `27057829077` showed `INVALID_ARGUMENT` on database `(default)` versus tenant `t-f6b7a0a1`.
- `loadOptions()` and `resolveParentUrl()` were already rebinding through the tenant db, so the remaining direct snapshot chain was the story lookup in `resolveStoryMetadata()`.

Chosen fix:
- Rehydrate the page snapshot through the tenant db before deriving the story ref.
- Added a regression test that proves `db.doc(path)` is used for story metadata loading.

Next-time guidance:
- When a cloud function uses a snapshot ref chain, audit every ancestor walk, not just the first child ref. A single direct `parent.parent` traversal can still drag the default database into the tenant flow.
