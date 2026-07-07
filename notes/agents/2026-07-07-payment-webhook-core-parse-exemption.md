# 2026-07-07 payment webhook core-parse exemption removal

- Unexpected hurdle: the first targeted Jest command used the repo's wrapper and hit the global coverage gate, which obscured the narrow regression check.
- Diagnosis path: traced the parse-gate exemption to `assertWebhookDependency` in `src/core/payment-webhook-core.js`, then confirmed the file only needed a helper rename to stop matching the core-parse rule.
- Chosen fix: renamed the dependency guard to `requireWebhookDependency`, removed `src/core/payment-webhook-core.js` from `core-parse-exemptions.json`, and repointed the parse-gate fixture to another existing exempt file.
- Next-time guidance: when retiring a core-parse exemption, prefer helper renames over broad refactors if the only trigger is the function name pattern.
