# Acceptance

- Returns `false` for a positive temporal overlap on the same asset.
- Returns `true` for touching segments on the same asset.
- Returns `true` when the existing overlap belongs to another asset.
- Returns `true` for a later non-overlapping segment on the same asset.
- Returns `false` for unknown or malformed proposed segment references.
- Run `npx jest test/toys/2026-08-20/assetSegmentAssignmentPredicate.test.js --runInBand`.
