# Tighten first dependency-cruiser rule (2026-03-10)

- **Unexpected hurdle:** No existing dependency-cruiser violations to react to, so the loop had to reason about the intended layering (core vs. local) and confirm that the repo already satisfies it before promoting the rule from idea to enforcement.
- **Diagnosis path:** Inspected `src/core` and `src/local` imports, ran targeted `rg` checks, and asserted that only local-side code depends on shared core helpers; no core module currently imports anything under `src/local`.
- **Fix:** Added the `core-no-local-deps` forbidden rule to `dependency-cruiser.config.cjs` (severity `error`) to keep shared core logic independent from runner plumbing, then verified with `npm run depcruise` and the standard `npm test` suite.
- **Next-time guidance / open question:** Future rule-tightening loops should continue the ratchet by looking for concrete violations (or cleanup targets) before increasing severity, and capture any new enforced boundary in `projects/dependency-cruiser/notes.md` so runners see the safe-to-enforce constraints.
