Refreshed `render-variant-core` docs to clear dozens of jsdoc warnings without touching the high-complexity helpers.

- Added concrete descriptions and type annotations for the destructured options used by `lookupAuthorUrl`, `resolveAuthorFile`, `resolveParentReferences`, `resolveParentSnapshots`, `resolveParentUrl`, `fetchPageData`, `resolveRenderPlan`, and `persistRenderPlan`, so each block now sits directly before its function instead of being separated by placeholder comments. That change alone dropped ~85 `src/core` warnings and avoided tinkering with complex logic.
- Repositioned the `lookupAuthorUrl` doc so it sits before the function and documented `buildParentRoute` alongside `isRouteDataValid` to satisfy the `jsdoc` rule while keeping the helper sequence readable.
- Running `npm run lint` followed by `npm test` confirmed the doc cleanup didn’t sway behavior or coverage, so we now have 265 `src/core` warnings (well past the 15% target) with no test regression.

Open questions / follow-ups:
1. Should we add helper-doc templates or lint rule config to remind future authors to keep JSDoc comments adjacent to functions that destructure their arguments?
2. Are there smaller functions we can break out of the remaining complexity warnings, or should we scope that to a future refactor?
