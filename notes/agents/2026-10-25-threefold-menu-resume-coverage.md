# Threefold menu resume coverage

- Unexpected hurdle: the exact-head Full Check had remained in progress while Playwright installed; it completed later with a global branch-coverage failure.
- Diagnosis: the coverage report identifies the untested positive branch for selecting Resume from the main in-game menu.
- Fix: add a menu regression that opens with Y, chooses the default Resume entry with A, and verifies pause, resume, and menu dismissal.
- Evidence: the menu regression is included in the renderer-focused change set. `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 local gates across six test shards. The exact-head GitHub Full Check remains separate and has not been verified for this commit.
- Next time: inspect the latest exact-head Full Check result before selecting a branch, and keep verification status separate from deployment status.
