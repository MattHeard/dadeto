# Shared auth helpers

- Duplications around token verification (submit-new-page vs. submit-new-story) vanished after I moved the bearer-token parsing and UID extraction into `src/core/cloud/auth-helpers.js`, which now exposes `verifyTokenSafe` and `resolveAuthorIdFromHeader`. Those helpers rely on `cloud-core.matchBearerToken` and `common-core.stringOrNull` so callers can keep their own decoded-token sanity checks (e.g., `validateDecodedToken`).
- Instead of defining identical `getAllowedOrigins` functions in multiple endpoints, the new `src/core/cloud/allowed-origins.js` wraps `cloud-core.resolveAllowedOrigins`, and each consumer now re-exports that helper (`get-moderation-variant`, `mark-variant-dirty`). That eliminated the second clone that was triggering jscpd at `minTokens: 24`.
- With the new helpers in place the duplication report now stays clean at 24 tokens, and the shared logic can be more easily reused elsewhere when similar auth/origin flows crop up.

Open questions / follow-ups:
- Should other cloud handlers adopt `resolveAuthorIdFromHeader` or the allowed-origins re-export so future jscpd runs remain quiet? Perhaps build a small checklist of patterns to watch for when adding new endpoints.
