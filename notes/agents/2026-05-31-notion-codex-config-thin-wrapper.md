# Notion Codex config thin-wrapper

- Unexpected hurdle: moving `src/local/notion-codex/config.js` into core exposed a tiny branch-coverage gap instead of a functional failure.
- Diagnosis: the missing edges were the non-object path in the normalizer and the loader's default-argument path when `loadNotionCodexConfig()` is called without options.
- Chosen fix: added focused tests for `normalizeNotionCodexConfig(null, ...)` and `loadNotionCodexConfig()` with no arguments, which restored the branch threshold.
- Next-time guidance: when splitting a local wrapper into core, cover both the "bad shape" input and the no-options loader path immediately so the global coverage gate stays stable.
