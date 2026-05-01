# 2026-05-01: Symphony Notion page move blocked

- **Unexpected hurdle:** The task status update succeeded, but moving the Symphony backlog mention into `Completed` was blocked by the no-overwrite safety rule.
- **Diagnosis path:** Fetched the Symphony page, fetched the first Backlog task, confirmed `Project = Dadeto`, `Status = Not Started`, and `Tags = symphony`, then fetched the task data source schema to update `Status` safely.
- **Chosen fix:** Marked the task `Done`, updated its summary, and left a concise Notion comment with the run ID and evidence instead of editing the Symphony page content.
- **Next-time guidance:** If the poll needs to move a mention between Symphony sections, use a non-destructive page-structure operation or confirm the workspace policy before attempting any content rewrite.
