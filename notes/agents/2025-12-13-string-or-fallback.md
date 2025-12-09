## String-or-Fallback Helper

- **Surprise**: `jscpd` kept pairing the `stringOrNull` + fallback patterns in `submit-moderation-rating-core` and `textAppendList`, despite the downstream logic diverging, so the duplication felt like a false positive.
- **Diagnosis & fix**: Added `stringOrFallback` to `common-core` and routed both sites through it—`coerceAuthorizationHeader` now delegates to `stringOrFallback(..., coerceHeaderArray)` and `normalizeInput` uses `stringOrFallback(..., normalizeNonStringValue)`—which keeps the guard logic shared without confusing the downstream behavior while also capturing the new helper in the duplication run.
- **Follow-up**: Ran `npm run duplication`, `npm run lint`, and `npm test`; all reports pass but the remaining clones (cyberpunk adventure, CORS/error helpers, etc.) still exist, so the next helper extraction should target whichever clone is highest priority.
- **Open questions**: Should `stringOrFallback` live in `cloud-core` instead since many future normalizations might need it, or is `common-core` acceptable for the current scope?
