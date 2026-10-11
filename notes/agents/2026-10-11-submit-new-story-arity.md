# Submit new story arity loop

- Unexpected hurdle: The lint report points to the helper's declaration even though the trigger is destructuring its `deps` record inside the body.
- Diagnosis: `saveNewStory` received dependencies alongside the explicit effect token, ID, and data, then destructured the two adapter functions from `deps`.
- Chosen fix: Read `saveSubmission` and `getServerTimestamp` directly by name from the dependency record; preserve the save payload and effect token flow.
- Evidence: Submit-new-story Jest suites passed (59 tests), target no-cache lint and TSDoc passed, and `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, 11 E2E tests, 100% line/statement/function/branch coverage, zero clones, and zero audit vulnerabilities. Cloud-only findings reduced from 2 to 1.
- Next-time guidance: Inspect the body of a reported function for hidden destructuring. Next inventory candidate: `tree-visibility/tree-visibility-core.js`.
