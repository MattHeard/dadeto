# Tighten dependency-cruiser rule slice

- **Hurdle:** Needed confidence that a new rule banning `src/local` → `src/cloud` would stay quiet.
- **Diagnosis:** Used focused `rg` checks for `src/local` imports referencing `src/cloud`; nothing matched, so the rule should not fire today.
- **Fix:** Added a warn-level `src-local-no-cloud` rule to `dependency-cruiser.config.cjs` and reran `npm run depcruise` to prove the policy remains clean.
- **Next-time guidance:** If future work exposes a local-to-cloud import, prioritize either refactoring it back behind the boundary or relaxing this rule with explicit justification before landing.
