## Observations
- Dendrite page handler is alive in `browser-core` now, so the toys map still works while any future refactors can rely on a single central helper.
- The shim files under `src/core/browser/inputHandlers/dendritePage.js` and `src/browser/inputHandlers/dendritePage.js` now just forward to `browser-core`, keeping compatibility with existing import paths without duplicating logic.

## Lessons and follow-ups
- When moving logic into `browser-core`, double-check the generated `public/` copies after running `npm run build` so downstream bundles match the new exports.
- Keeping the helper visible through the shim makes it easy to revert the change if the handler becomes active again without touching the toys wiring.

## Open questions
- Should we eventually drop the `'dendrite-page'` entry in the toys input map if nobody uses it, or leave it as a no-op for compatibility?
