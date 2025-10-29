## Entry/Core moderation endpoints bridge

- **Challenge:** Needed to move the moderation endpoint memoization into the core layer without regressing the browser workflow, which previously cached the promise inside the entry file.
- **Resolution:** Introduced `src/core/browser/moderation/endpoints.js` with helper factories that accept the static config loader and optional logger, updated `moderate.js` to inject those dependencies, and verified the new contract with dedicated Jest tests after fixing ESM imports.
