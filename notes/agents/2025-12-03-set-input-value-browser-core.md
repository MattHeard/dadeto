## Observations
- While wiring `setInputValue` exports through the browser core, I noticed the working tree already had `getInputValue` removed from `src/core/browser/inputValueStore.js` and the corresponding tests importing it from `browser-core`. That diff predates my changes, so I left it untouched and treated it as legacy state while aligning the new import surfaces.
- Running `npm run build` propagated the new browser-core surface to the generated `public/` tree, so the build artifacts now match the updated `src` logic instead of the stale copies that shipped on HEAD.

## Lessons and follow-ups
- When unexpected diffs appear, inspect `git show HEAD` to understand whether they are pre-existing or a side effect of tooling, and call that out so future agents know the baseline was already dirty.
- It might be worth clarifying with maintainers whether `inputValueStore.js` should still document `getInputValue` for unit tests or if every consumer should go through `browser-core` now; otherwise future agents may accidentally revert this drift.

## Open questions
- Can we treat `browser-core` as the sole entry point for consumers needing both `getInputValue` and `setInputValue`, or should `inputValueStore.js` keep exposing them for low-level tests?
