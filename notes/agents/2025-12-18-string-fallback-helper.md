## Unexpected hurdles
- `npm run duplication` kept pointing at the string guard blocks inside `src/core/common-core.js`, even after the earlier `normalizeStringCandidate` change, because `ensureString` and `stringOrNull` each reimplemented the same guard and the two fallback helpers shared nearly identical control flow (check + fallback). The report made it clear that the clone was still there despite the helper addition since the repeated `if (normalized)` block lived in three places.

## How I addressed it
- Introduced a tiny `withStringFallback` helper that centralizes `getStringCandidate` + predicate + fallback invocation so the guard/fallback pattern is expressed once. `stringOrDefault` and `stringOrFallback` now delegate to this helper with the appropriate acceptance predicate, and `ensureString` simply reuses `stringOrNull`, leaving only one copy of the guard left in the module. With the helper in place, `npm run duplication` no longer flags the custom string helpers while the consumer-facing APIs behave exactly the same.

## Follow-up idea
- If we ever need more string-handling helpers, keep leaning on `withStringFallback` (or a similar predicate/fallback helper) rather than reintroducing the guard; it makes the duplication report quiet and keeps the normalization logic consistent.

