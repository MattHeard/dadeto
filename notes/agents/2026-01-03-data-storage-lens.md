# Data/localStorage tsdoc cleanup

- **Unexpected hurdle:** Once `noImplicitAny` was live, `tsdoc:check` complained that the permanent-state helpers were still relying on untyped storage, and the raw localStorage lens helper returned `unknown` everywhere thanks to `tryWithLog`.
- **Work:** Added generics to `StorageLens`, taught `focusLens`/`mapLens` to preserve the payload type, tightened `withStorage` so callers always pass a fallback, and guarded `loadDataFromLens` with `isNonNullObject` to ensure `BlogStateRecord` is the emitted shape. This also meant casting the lens returned by `createLocalStorageLens` to `StorageLens<BlogStateRecord>` so downstream callers never touch `unknown` again.
- **Next steps:** The follow-up beads `dadeto-ej0`, `dadeto-ycn`, and `dadeto-ho5` still cover the moderation helpers, presenter DOM typings, and toy helpers that `tsdoc:check` lists right after this new batch.
