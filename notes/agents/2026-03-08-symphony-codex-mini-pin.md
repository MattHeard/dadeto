# 2026-03-08: symphony codex mini pin

- Bead: `dadeto-1zij`
- Scope: switch Symphony from the current explicit model pin to `gpt-5.1-codex-mini` using the official OpenAI support/pricing follow-up already attached to `dadeto-bd4r`.
- Model choice:
  - pinned `gpt-5.1-codex-mini`
  - justification source: the `dadeto-bd4r` follow-up note cites OpenAI Help for ChatGPT-plan Codex model support and OpenAI pricing for Codex model relative cost
  - rationale: that follow-up indicates the GPT-5.1-Codex family is supported for ChatGPT-plan Codex, and `gpt-5.1-codex-mini` is cheaper than the larger Codex variants
- Change:
  - replaced the Symphony launcher pin from `gpt-5.4` to `gpt-5.1-codex-mini` in `src/local/symphony/launcherCodex.js`
  - updated focused launcher/config/launch tests to lock the new explicit model contract
- Validation:
  - focused Symphony launcher/config tests passed
  - one fresh live Symphony launch was used to verify whether the installed runtime accepted the explicit `gpt-5.1-codex-mini` model
- Follow-up:
  - if the live runtime contradicts the external evidence, the run stderr artifact should be treated as the immediate blocker and captured on the bead
