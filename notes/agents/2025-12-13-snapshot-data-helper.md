## Snapshot Data Helper

- **Surprise**: The jscpd report kept flagging the snapshot data guard in both `hide-variant-html-core` and `process-new-story-core`, even though they were looking at different payloads—the repeated `snapshot.data()` guard stood out because its scope was identical.
- **Diagnosis & fix**: Added `hasSnapshotData`/`getSnapshotData` helpers to `cloud-core` and swapped both files to consume them, which removed the duplicated guard and kept the shared logic within the cloud utilities layer instead of scattering it across handlers.
- **Follow-up**: Ran `npm run duplication`, `npm run lint`, and `npm test`; all still pass but the clone list now only includes unrelated ones (cyberpunk adventure/other short sequences), so the next focus should be whichever clone jscpd considers most important.
- **Open questions**: Should future Firestore helpers, like snapshot-to-data coercions, live alongside these new utilities so other cloud modules can reuse them as well?
