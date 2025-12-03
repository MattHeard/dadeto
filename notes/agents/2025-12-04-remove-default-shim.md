## Observations
- Once the toys imports and builds no longer needed `inputHandlers/default.js`, the shim was redundant—nothing in `src/`, `public/`, or tests referenced that path anymore.
- Removing it required clearing both the source and generated copies because the build pipeline simply copies `src/...` into `public/...` without pruning stale files.

## Lessons and follow-ups
- When deleting legacy shims, double-check `public/` after running the copy/generate pipeline so stale files don’t linger and reintroduce broken imports.
- If we ever need to provide an API alias, we can reintroduce a lightweight re-export under a different path instead of keeping the old shim around forever.

## Open questions
- Should we prune other unused shims in `src/browser/inputHandlers/` or `src/core/browser/inputHandlers/` as we touch dependencies, or do they need to stay for backwards compatibility?
