# Acceptance

- Returns `false` for overlapping segments assigned to the same person.
- Returns `true` for touching segments.
- Returns `true` when overlapping existing segments belong to other people.
- Returns `false` for unknown or malformed proposed references.
- Run `npx jest test/toys/2026-08-20/personSegmentAssignmentPredicate.test.js --runInBand`.
