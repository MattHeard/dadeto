# 2026-03-15 dadeto-mh-vwf Runner Loop

- **Unexpected hurdle:** `tsdoc:check` still ranked assign-moderation-job as failing because the CORS helper and variant selector were emitting `string[] | undefined`/`unknown[] | undefined` footprints that the strict checker could not narrow.
- **Diagnosis path:** Inspected the tsdoc log for `assign-moderation-job-core.js`, verified the offending lines around the CORS handler and snapshot reader, and confirmed the optional allowed-origins list and `snapshot.docs` were leaking `undefined` while the guard types treated them as required.
- **Chosen fix:** Defaulted the CORS origin handler to `[]` when no allow-list is provided so `isOriginAllowed` always sees an array, and tightened the variant snapshot helpers by allowing `undefined` snapshots, narrowing the doc array with `docs ?? []`, and widening `selectVariantDoc`/`isSnapshotEmpty` types so they never forward `undefined` arrays to TypeScript.
- **Next-time guidance / open questions:** When tsdoc errors cite optional payloads, fix the helper by making the upstream type optional and providing a defensive fallback (e.g., `?? []`) before returning; rerun the targeted `npx jest test/cloud/assign-moderation-job/core.test.js --runInBand` to confirm the guard surfaces stay green.

Runner evidence: 2026-03-15T11:45:40.024Z--mh-vwf
