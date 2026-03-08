# 2026-03-08: symphony codex cli compat

- Bead: `dadeto-ec7n`
- Scope: align the Symphony Ralph launcher defaults with the installed `codex exec` CLI so a fresh launch gets past argument parsing.
- Change:
  - inspected local `codex exec --help` and confirmed that `--ask-for-approval` is not a supported `exec` flag in the installed CLI
  - removed the unsupported `--ask-for-approval never` pair from `DEFAULT_CODEX_RALPH_ARGS` in `src/local/symphony/launcherCodex.js`
  - kept the bounded launcher defaults otherwise unchanged: `exec`, `--skip-git-repo-check`, `--model gpt-5-mini`, and `--sandbox workspace-write`
  - updated focused launcher/config/launch tests so the supported contract is locked in one place
- Validation:
  - `codex exec --help` shows support for `--model`, `--sandbox`, and `--full-auto`, but not `--ask-for-approval`
  - focused Symphony launcher tests passed
  - one fresh live Symphony launch no longer failed immediately with the old Codex CLI parse error
- Follow-up:
  - this bead only fixes launcher compatibility; later slices can address completion reconciliation or any next-stage runtime blocker that appears after Codex starts successfully
