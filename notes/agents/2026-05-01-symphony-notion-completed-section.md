# 2026-05-01: Symphony Notion completed-section move

- **Unexpected hurdle:** the Symphony page content move succeeded, but the direct Notion task-status update was rejected by the connector safety gate.
- **Diagnosis path:** fetched the Symphony page, fetched the backlog task page and confirmed it was `Project = Dadeto`, `Status = Not Started`, and tagged `symphony`, then retried the page move with a narrow content update and used a page comment to record the run ID.
- **Chosen fix:** moved the backlog mention under Symphony `Completed`, left a concise Notion comment with the run ID, and recorded the handled outcome in `tracking/notion-codex/outcomes/`.
- **Next-time guidance:** if the connector rejects a status write even after precondition checks, keep the content move and comment as the durable evidence, then revisit the property update with a tighter schema-specific write path instead of broadening the edit.
