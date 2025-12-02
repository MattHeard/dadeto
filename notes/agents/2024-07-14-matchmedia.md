# Agent Retrospective – 2024-07-14 (Admin core matchMedia)

- **Surprise:** `resolveMatchMediaFunction` kept tripping complexity because of the `if` guard that validated the helper; ESLint counted the branching even though it was a necessary guard.
- **Action:** Delegated the validation to `ensureMatchMediaFunction`, leaving `resolveMatchMediaFunction` as a single return of `ensureMatchMediaFunction(win.matchMedia)`.
- **Lesson:** Guard checks belong in their own helpers so the caller stays complexity-compliant while the logic remains easy to follow.
- **Follow-up idea:** Apply the same helper pattern to other resolver functions that still have inline guards (e.g., `resolveQuerySelectorAllFunction`).
