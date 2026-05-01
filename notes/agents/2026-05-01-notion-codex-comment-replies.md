# 2026-05-01 Notion Codex Comment Replies

- **Unexpected hurdle:** The existing unattended reply helper was named and shaped around appending page blocks, but the desired behavior is a Notion comment.
- **Diagnosis path:** Compared the local `notion-codex` scripts, poller prompt, and API helper with the public Notion comments endpoint. The public API supports page or block comments with `POST /v1/comments`, but not starting a new inline selected-text discussion.
- **Chosen fix:** Kept the existing CLI entry point for compatibility and changed it to create a page-level comment with `parent.page_id` and rich text beginning with `Codex reply <run-id>`.
- **Next-time guidance:** If inline comments on a specific text selection are required, use the MCP connector comment tool interactively or add a block-resolution step before calling the public API with `parent.block_id`.
