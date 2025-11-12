# Reduce Core Browser Complexity

- ESLint marks each `if`/`try` as a complexity branch, so shaving down the flagged functions meant pulling any validation and error handling into tiny helpers instead of keeping it inline. That also meant the `createModerationEndpointsPromise` refactor had to stop being `async` with a `try/catch` in the exported function, because that suddenly triggered a complexity-5 warning; isolating the loader logic containing `try/catch` brought the export back down below the threshold.
- These helpers leave the exported entry points much leaner, which keeps future lint runs from regressing and makes it easier to reason about the core/browser surface area.
- Going forward, I’ll treat any new complexity warning as a signal to extract a helper instead of piling another conditional into the same function. No remaining blockers, but we should keep an eye on similar helpers elsewhere in `src/core/browser`.
