# 2026-03-08: Symphony cheapest Codex defaults

- Unexpected hurdle: "cheapest and most bounded" launcher defaults were underspecified, and guessing unsupported Codex flags would have made the launcher brittle.
- Diagnosis path: checked the existing Symphony launcher/config tests, then inspected the local `codex exec --help` output to confirm the supported non-interactive flags before changing defaults.
- Chosen fix: replaced the `--full-auto` alias with one shared Ralph default arg list that explicitly uses `--model gpt-5-mini` and `--sandbox workspace-write`, then updated focused launcher/config tests to lock that contract down.
- Next-time guidance: keep Codex launcher defaults centralized in one exported constant so config normalization and launch fallback paths cannot silently drift apart again.
