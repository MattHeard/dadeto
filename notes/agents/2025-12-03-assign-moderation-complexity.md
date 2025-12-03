## Assign Moderation Job Complexity (2025-12-03)

- **Unexpected:** The complexity warnings were triggered by `handleGuardError` and `getGuardContextValue` even though their bodies were simple guard clauses; the rule counts nested ternaries, optional chaining, and default operands toward the score, so removing guard expressions wasn't enough.
- **Diagnosis:** I extracted the boolean decision into `hasGuardError` and shared the context fallback through `getContextOrFallback` so both exported helpers sit under the max complexity while still honoring `result?.error` and `context ?? {}` semantics.
- **Actionable takeaway:** Extract expressions that combine branching operators into dedicated helpers that each carry a single logical outcome; this keeps the exported functions clean and keeps ESLint’s complexity metric satisfied without masking the rule.
- **Testing:** `npm run lint` (render-variant warnings remain) and `npm test`.
