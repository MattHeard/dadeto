# Dependency-cruiser baseline loop (2026-03-09)

- **Unexpected hurdle:** Dadeto already listed `dependency-cruiser` as a dev dependency, but the repo lacked a runnable config or check hook, so the first loop had to prove the tool even works end to end.
- **Diagnosis path:** Confirmed the dependency existed, inspected `projects/dependency-cruiser/notes.md` for the intent to start with a small, low-noise rule, and sketched a rule that would only cover `src/local`.
- **Fix:** Added `dependency-cruiser.config.cjs` with a `warn`-level no-circular rule scoped to `src/local`, created an npm `depcruise` script driven by that config, and chained the script into `npm run check` so the check flow runs dependency-cruiser baseline output.
- **Next-time guidance / open question:** The current rule is intentionally narrow; future loops should rely on actual graph feedback to ratchet new families of forbidden dependencies or tighten the severity once the codebase settles around the expected architecture.
