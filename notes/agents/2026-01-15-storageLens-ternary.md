# 2026-01-15 storageLens ternary

- **Surprise:** `bd` still warns that the daemon takes >5s to start; it switches to direct mode automatically, so commands succeeded but double-check daemon health if this persists.
- **Action:** Replaced the `focusLens` candidate selector ternary with an explicit `if/else` guard so the `no-ternary` warning disappears, then reran `npm test` and `npm run lint` to ensure there were no regressions.
- **Follow-up:** Documented the cyclomatic complexity helper in `AGENTS.md` so future agents hit the JSON tool before refactoring a complex function.
