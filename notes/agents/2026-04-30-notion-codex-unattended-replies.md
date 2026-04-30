# 2026-04-30 Notion Codex Unattended Replies

## Hurdle

The background `codex exec` worker could read Notion through the connector, but
connector page updates failed as cancelled MCP writes because the run is
non-interactive.

## Change

- Added `scripts/notion-codex-append-reply.js`, an append-only Notion API helper
  that writes a divider, `Codex reply <run-id>` marker heading, and reply
  paragraphs to a configured page.
- Added `src/local/notion-codex/notionApi.js` with token resolution, reply block
  construction, and PATCH `/v1/blocks/{block_id}/children` request handling.
- Updated the poll worker prompt to use connector tools for Notion reads only
  and call the local append helper for replies.
- Added `tracking/notion-codex/.gitignore` so local run state/logs stay out of
  commits.

## Evidence

- `node --experimental-vm-modules ./node_modules/.bin/jest test/local/notionCodex.config.test.js test/local/notionCodex.launcher.test.js test/local/notionCodex.poll.test.js test/local/notionCodex.notionApi.test.js --watchman=false`
- `./node_modules/.bin/eslint src/local/notion-codex scripts/notion-codex-poll.js scripts/notion-codex-append-reply.js test/local/notionCodex.config.test.js test/local/notionCodex.launcher.test.js test/local/notionCodex.poll.test.js test/local/notionCodex.notionApi.test.js --no-color`
- `node scripts/notion-codex-poll.js --dry-run`
- `npm test`

`npm run lint` still fails on pre-existing generated
`infra/cloud-functions/**/common-core.js` parse errors and unrelated complexity
warnings outside this slice. A live Notion append was not attempted because this
shell has neither `NOTION_API_KEY` nor `NOTION_TOKEN` set.
