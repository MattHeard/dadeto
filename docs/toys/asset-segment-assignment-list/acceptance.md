# Acceptance

- Valid assignments append to temporary, permanent, and envelope memory through MEMO4.
- Each stored object contains only trimmed `assetId` and `segmentId`.
- Existing entries remain in order; duplicate references are appended rather than deduplicated.
- Missing or blank IDs are rejected without writing.
- Run `npx jest test/toys/2026-08-20/assetSegmentAssignmentList.test.js --runInBand`.
