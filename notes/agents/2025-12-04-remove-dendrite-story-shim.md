## Observations
- With all consumers now using `browser-core`, the `inputHandlers/dendriteStory.js` shim had nothing pulling it, so I deleted the source and generated copies.
- Running `npm run build` ensured no stale shim remains in `public/` either.

## Lessons and follow-ups
- After deleting shims, confirm `public/` is kept in sync because the copy step blindly mirrors whatever remains in `src/`.
- We may continue pruning other unused shims once all dependencies reach `browser-core`.

## Open questions
- Should we audit the rest of `src/browser/inputHandlers/` to drop any unused wrappers now that the core helper exports are centralized?
