# 2026-05-01: symphony notion done closeout

- **Unexpected hurdle:** The Notion page update for `Status = Done` was rejected until I re-fetched the task page right before the write.
- **Diagnosis path:** Fetched the Symphony page, fetched the first Backlog task, confirmed `Project = Dadeto`, `Status = Not Started`, and `Tags = symphony`, then checked the Notion task collection schema to verify that `Status` accepts `Done`.
- **Chosen fix:** Updated `src/local/notion-codex/prompt.js` to tell the worker to set a completed task's status to `Done`, added a focused assertion in `test/local/notionCodex.poll.test.js`, ran `npm test`, and closed the selected Notion task with a `Done` status plus an evidence comment.
- **Next-time guidance:** For future Notion property writes, fetch the exact page or data source immediately before the update so the connector accepts the change without a safety retry.
