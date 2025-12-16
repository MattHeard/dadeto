## Reflection 2025-12-24

- Introduced `http-method-guard` so every POST-only cloud handler shares one guard and response payload, keeping `report-for-moderation`, `submit-moderation-rating`, and `get-api-key-credit` aligned on the same predicate instead of duplicating the `normalizeMethod`/`METHOD_NOT_ALLOWED_RESPONSE` boilerplate.
- Added `runWithFailureAndThen` to `response-utils` and had both `generate-stats` and `mark-variant-dirty` rely on it, which collapsed the repeated `runWithFailure`, early-return, and success-path scaffolding into a single call so they only describe what to do on failure and on success.
- Reran `npm run duplication` and the shared helpers removed the targeted clones, but there are still jscpd findings inside the browser input handlers and the copy/generate stats section; I left those untouched because they require larger refactors (e.g., consolidating textarea/moderator form helpers or reusing `copy` utilities) and noted them here for a follow-up.

Open questions/follow-ups:
- Should the remaining input-handler clones be consolidated via a shared setup utility (e.g., factor the repetitive DOM helper wiring into one export) so the overall duplication report drops further?
