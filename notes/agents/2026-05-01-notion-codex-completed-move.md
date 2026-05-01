# 2026-05-01: Symphony backlog item move to Completed

- **Unexpected hurdle:** the Notion connector rejected content-only and property-only writes unless both `properties` and `content_updates` were present.
- **Diagnosis path:** fetched the Symphony page and task page, then retried the writes with the connector-required empty companion field.
- **Chosen fix:** moved the task mention from Backlog to Completed on the Symphony page, set the task `Status` to `Done`, and left a concise evidence comment on the task page.
- **Next-time guidance:** when using the Notion page update tool, include the required empty companion field even for single-purpose updates.
