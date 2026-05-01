# 2026-05-01: Symphony poller prompt now accepts any non-Done backlog task

- Unexpected hurdle: the Notion connector accepted the Symphony content move, but `update_page` required a dummy `content_updates` field even for property-only writes, and `create_comment` required Notion rich-text objects instead of plain strings.
- Diagnosis path: compared the Symphony page fetch, the task page fetch, and the local poller prompt/test to confirm the change was prompt-only; then retried the connector writes with the payload shape the schema actually enforced.
- Chosen fix: changed `src/local/notion-codex/prompt.js` so the selection gate says the first Backlog task must be Project Dadeto, tagged `symphony`, and not `Done`; updated the dry-run assertion in `test/local/notionCodex.poll.test.js`; moved the Symphony mention to `Completed`, marked the task `Done`, and left an evidence comment.
- Next-time guidance: if the connector reports a validation mismatch, try the same operation with the smallest schema-compliant placeholder payload before falling back to local helpers.
