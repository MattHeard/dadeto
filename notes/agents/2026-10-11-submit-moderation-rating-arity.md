# Submit moderation rating arity loop

- Unexpected hurdle: The lint candidate was a rating-record writer rather than the larger dependency factory named by its source file.
- Diagnosis: `createRecordModerationRating` accepted one rating record and destructured five values at the callback boundary.
- Chosen fix: Read each rating field explicitly from the `rating` record and retain the stored document shape.
- Evidence: All submit-moderation-rating Jest suites passed (29 tests), target no-cache lint and TSDoc passed, and `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, 11 E2E tests, 100% line/statement/function/branch coverage, zero clones, and zero audit vulnerabilities. Cloud-only findings reduced from 3 to 2.
- Next-time guidance: Inspect the exact reported function rather than assuming the issue is the file's top-level dependency factory. Next inventory candidate: `submit-new-story/submit-new-story-core.js`.
