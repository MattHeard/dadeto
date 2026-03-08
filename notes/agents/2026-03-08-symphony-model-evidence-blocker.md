# 2026-03-08: symphony model evidence blocker

- Bead: `dadeto-bd4r`
- Scope: determine whether local evidence is sufficient to prove the cheapest supported explicit Codex model for Symphony.
- What local evidence exists:
  - `codex exec --help` exposes model selection but does not list available models or pricing
  - `~/.codex/config.toml` pins the local Codex default model to `gpt-5.4`
  - `~/.codex/models_cache.json` exposes a cached `gpt-5.4` entry locally
  - local Symphony run artifacts prove `gpt-5-mini` is unsupported for the installed ChatGPT-backed account and prove `gpt-5.4` launches successfully
  - local Codex TUI logs show historical model names such as `gpt-5.1-codex-mini`, `gpt-5.2-codex`, and `gpt-5.3-codex`, but those logs do not prove current account support, current explicit selectability in `codex exec`, or relative pricing
- Conclusion:
  - local evidence is sufficient to justify pinning `gpt-5.4` as a supported explicit model
  - local evidence is not sufficient to prove that `gpt-5.4` is the cheapest supported practical explicit model
  - the unresolved blocker is the lack of a local source that maps currently supported explicit models for this account to relative price or tier
- Practical outcome:
  - Symphony should keep the explicit `gpt-5.4` pin for determinism until new local evidence identifies a cheaper supported explicit model
  - a future cheapest-model slice needs one new local evidence surface, such as a current account-visible supported-model list with pricing/tier data, before it can close honestly
