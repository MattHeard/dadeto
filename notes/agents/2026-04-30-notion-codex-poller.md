# 2026-04-30 Notion Codex Poller

## Hurdle

Dadeto needed a local polling entry point that can run on lorandil, check the
Dadeto Notion project for Codex-directed messages or ready tasks, and launch a
bounded Codex worker without duplicating active runs.

## Change

- Added `src/local/notion-codex/` with config normalization, state storage,
  prompt construction, detached Codex launch logging, and one-shot poll logic.
- Added `scripts/notion-codex-poll.js` with `--once`, `--watch`, `--dry-run`,
  and `--config` options.
- Added npm scripts `notion:codex:poll` and `notion:codex:poll:dry`.
- Added focused tests for config, launcher log wiring, and active-run polling
  behavior.

## Evidence

- `node --experimental-vm-modules ./node_modules/.bin/jest test/local/notionCodex.config.test.js test/local/notionCodex.launcher.test.js test/local/notionCodex.poll.test.js --watchman=false`
- `node scripts/notion-codex-poll.js --dry-run`
- `./node_modules/.bin/eslint src/local/notion-codex scripts/notion-codex-poll.js test/local/notionCodex.config.test.js test/local/notionCodex.launcher.test.js test/local/notionCodex.poll.test.js --no-color`
- `npm test`

Project-wide `npm run lint` still fails on pre-existing generated
`infra/cloud-functions/**/common-core.js` parse errors and unrelated complexity
warnings outside this slice.
