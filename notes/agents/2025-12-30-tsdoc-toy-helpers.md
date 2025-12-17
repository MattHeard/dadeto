## Tfdoc helper fixes

- tsdoc:check was still failing on a handful of helper shims (toy tasks plus the Firestore helper), so I added explicit `Map<string, …>` typings, null guards around the injected helpers, and declared `collectionGroup` on `types/firebase-admin/firestore.d.ts` so the `buildPageByNumberQuery` helper type-checks as soon as `collectionGroup` is invoked.
- The under-constrained stub types for Firebase Admin (missing `collectionGroup`) came as a surprise; that little shim was the only thing blocking the Firestore helper from even registering as a tsdoc error, so adding the method restored parity with the actual runtime API.
- `npm run tsdoc:check` still fails deep in `admin-core.js` and the cloud helpers, so future efforts should keep picking off the single-error files until that list is manageable.
