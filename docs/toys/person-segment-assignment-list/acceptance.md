# Acceptance

- Valid assignments append in order.
- Stored objects contain only trimmed `personId` and `segmentId`.
- Duplicate assignments remain separate entries.
- Missing or blank IDs are rejected without a successful append.
- Run `npx jest test/toys/2026-08-20/personSegmentAssignmentList.test.js --runInBand`.
