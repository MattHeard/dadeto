# Submit moderation rating arity cleanup

- Unexpected hurdle: the responder's factory callback destructured five functions from a single dependency record, triggering effective arity five.
- Diagnosis: `createResponder` already passes a named dependency record; the callback can read its five function references directly without expanding the bag.
- Fix: assign the typed record once and read the five functions individually. Calls remain bare function calls, preserving binding; validation, effect boundaries, Firestore writes, and response behavior are unchanged.
- Evidence: focused submit-moderation-rating core suite passed (1 suite / 24 tests); target no-cache arity scan and TSDoc passed. Elevated `npm run check` passed all 10 gates. Coverage: lines 23564/23564, statements 24713/24713, functions 7927/7927, branches 13273/13273 (100%). Local E2E passed 11/11, duplication found 0 clones, npm audit found 0 vulnerabilities. Cloud-only inventory fell to 10 findings in 10 files in `/tmp/parameter-bag-cloud-after-submit-moderation-core.json`.
- Next time: use the refreshed cloud inventory; `generate-stats-core.js` remains the largest finding at effective arity 14.
