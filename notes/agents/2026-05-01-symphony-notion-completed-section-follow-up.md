# 2026-05-01: Symphony Notion completed-section follow-up

- **Unexpected hurdle:** the Notion connector rejected the task-state write and the content move as safety-sensitive updates even after the task data source schema was fetched.
- **Diagnosis path:** fetched the Symphony page, fetched the first backlog task, fetched the `💪 Next actions` data source schema, confirmed `Status` accepts `Done`, then tried the Notion writes and recorded the connector errors.
- **Chosen fix:** updated `src/local/notion-codex/prompt.js` so completed tasks are instructed to move under Symphony `Completed`, aligned the dry-run regression in `test/local/notionCodex.poll.test.js`, ran `npm test`, and left a Notion comment with the run ID and evidence.
- **Next-time guidance:** if the queue still needs a state transition, start from the connector write path rather than the prompt. The local repo now encodes the right completion instruction; the remaining work is a Notion-side state update once the workspace permits it.
