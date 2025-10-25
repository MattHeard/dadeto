# Admin action refactor helper

- Spotted duplicated dependency validation between `createTriggerRender` and `createTriggerStats` while searching for identical functions.
- Extracted a shared helper that wraps the token guard so both exports reuse the same logic.
- Verified the change set with the full `npm test` run to ensure no regressions slipped in.
