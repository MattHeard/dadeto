# 2026-03-08: symphony codex model default

- Bead: `dadeto-97ws`
- Scope: remove the unsupported forced model from Symphony Ralph launcher defaults so Codex can use the installed account's supported default model.
- Change:
  - removed the explicit `--model gpt-5-mini` pair from `DEFAULT_CODEX_RALPH_ARGS` in `src/local/symphony/launcherCodex.js`
  - kept the remaining bounded defaults: `exec`, `--skip-git-repo-check`, and `--sandbox workspace-write`
  - updated focused launcher/config/launch tests so the shared default contract no longer assumes a specific model that may not exist for the current account
- Validation:
  - the previous live run failed after startup with `The 'gpt-5-mini' model is not supported when using Codex with a ChatGPT account.`
  - focused Symphony launcher/config tests passed after removing the forced model
  - a fresh live Symphony launch no longer emitted that unsupported-model error
- Follow-up:
  - this bead only fixes model compatibility; later slices can address whatever the next runtime blocker is after Codex picks an account-supported default model
