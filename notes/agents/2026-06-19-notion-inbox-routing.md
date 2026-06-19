# 2026-06-19 notion inbox routing

- Unexpected hurdle: the repo already had Notion Codex config support, but no short router note that told Codex where to find the inbox list quickly.
- Diagnosis path: searched `AGENTS.md`, `docs/repo-map.md`, and `src/core/local/notion-codex/config.js`, then confirmed `inboxPageIds` lives in `tracking/notion-codex.local.json`.
- Chosen fix: added a small `AGENTS.md` section that points future runs to `tracking/notion-codex.local.json` and the Notion Codex config module.
- Next-time guidance: if the inbox list moves, update this router note first so future agents do not have to rediscover the path from tests.
