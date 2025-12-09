## Shared method normalization

- **Unexpected:** `npm run duplication` kept reporting a clone between `get-api-key-credit-v2` and `mark-variant-dirty` even after several rounds of other refactors. At first glance both functions were short and different enough that I almost skipped them, but the report pointed to the same normalized-block shape (string guard + fallback), so I had to dig deeper.
- **Diagnosis:** I inspected the cloned sections and noticed both places were simply taking an HTTP method candidate, checking `typeof method === 'string'`, and returning either the candidate or a hard-coded default (`''` for the credit handler, `POST` for the variant endpoint). I considered reusing `ensureString`, but that helper unconditionally returns `''`, so it couldn’t cover the `POST` fallback without changing its contract. Instead I created a minimal `stringOrDefault` helper that returns the string when available and a caller-supplied fallback otherwise.
- **Action & learning:** Added `stringOrDefault` to `src/core/common-core.js` (using `stringOrNull` so an empty string still counts as “found”) and refreshed `deriveRequestMethod`/`resolveAllowedMethod` to call it. The duplication report now no longer references the cloud handlers, so the same pattern can be reused the next time we need simple string fallback normalization. Going forward, share helpers for these simple guards before writing ad-hoc duplicates across endpoints.
- **Next step/questions:** Should other request-normalization helpers (e.g., header parsing) be audited for this pattern too? Ticketed clones from `cyberpunkAdventure` and `generate-stats` still exist; those can be tackled separately.

**Testing**
1. `npm run duplication`
2. `npm run lint`
3. `npm test`
