# Hide variant HTML effect audit

- Unexpected hurdle: the backlog row's recorded next step still points at `get-api-key-credit-v2`, although Beads already records that endpoint as migrated and audited.
- Diagnosis: inspected the full `hide-variant-html` entrypoint and core trigger call tree. Firebase initialization runs inside `createEffectStartupBoundary`; the Firestore reference loads use `.get()` only; Cloud Storage `.delete()` is executed by the permission-first `deleteStorageFile` adapter, and the trigger handler receives a fresh invocation capability.
- Chosen fix: no source change was needed because this endpoint already meets the effect boundary. Recorded the audit and retained the active source-cloud expansion work in Beads.
- Next-time guidance: use the checked-in endpoint sources and Bead evidence when the Notion Next step is stale. Continue the lexicographic audit at `src/cloud/mark-variant-dirty/` and classify query/read calls separately from command adapters.
- Evidence: `node scripts/run-jest.js --runInBand` for all six `hide-variant-html` suites passed (47 tests); `npx tsc --project tsconfig.jsdoc.json --noEmit --pretty false` passed.
