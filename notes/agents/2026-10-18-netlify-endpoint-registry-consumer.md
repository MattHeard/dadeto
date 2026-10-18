# Retrospective: Netlify endpoint registry consumer

- **Unexpected hurdle:** the Rank 2 worktree branch already contained an unrelated GitHub App guidance commit, so the first draft PR included changes outside this slice. The first GitHub tree draft also rejected deletion entries without file mode metadata.
- **Diagnosis:** compare the topic branch ancestry and changed-file list with main before publishing; check the Git data API's tree entry requirements for deletions.
- **Fix:** rebuilt the PR branch from main with only the 12 Rank 2 files. Deletion entries now include blob mode and type.
- **Next time:** inspect branch ancestry and PR changed files before opening the PR, and include mode/type on Git tree deletions.
