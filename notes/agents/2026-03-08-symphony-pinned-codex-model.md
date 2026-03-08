# 2026-03-08: symphony pinned codex model

- Bead: `dadeto-vrk8`
- Scope: pin an explicit Codex model for Symphony Ralph launches instead of relying on the account default.
- Model choice:
  - pinned `gpt-5.4`
  - rationale from local evidence: `gpt-5-mini` was explicitly rejected by the installed ChatGPT-backed Codex account, while a fresh default-model launch started successfully and reported `model: gpt-5.4` in the run stderr artifact
  - cheaper supported alternatives were not discoverable from local CLI help or local runtime artifacts, so this slice avoids guessing at undocumented account support
- Change:
  - added `--model gpt-5.4` back into `DEFAULT_CODEX_RALPH_ARGS` in `src/local/symphony/launcherCodex.js`
  - updated focused launcher/config/launch tests to lock the explicit model contract
- Validation:
  - focused Symphony launcher/config tests passed
  - a fresh live Symphony launch using the pinned model started successfully and wrote `model: gpt-5.4` in the stderr transcript without a model-selection error
- Follow-up:
  - if later work needs a cheaper model than `gpt-5.4`, that requires new account-specific evidence for another explicitly selectable supported model rather than inference from naming alone
