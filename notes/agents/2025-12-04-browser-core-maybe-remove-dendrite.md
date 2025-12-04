## Observations
- `maybeRemoveDendrite` ultimately belongs in the shared `browser-core`, but there were still references to the old `removeElements` shim inside the `public/core/inputHandlers` copies because the copy workflow never prunes those legacy paths.
- Regenerating the assets (`npm run build`) refreshed `public/inputHandlers`/`public/core/browser` but left stale assets in `public/core/inputHandlers`, so I had to reintroduce the shim there with an explicit re-export instead of editing every dependent file.

## Lessons
- If we delete a generated path, assume the generator won't clean up *any* old copies; search `public/` for the previous import pattern (e.g., `./removeElements.js`) and either re-export from the new shared module or remove the references once you're confident there are no remaining consumers.
- Keeping the re-export in `public/core/inputHandlers` lets the legacy `/core` namespace survive with minimal diff while the source-of-truth moves to `browser-core`; future cleanups can revisit whether that namespace is still necessary.

## Open questions
- At what point can we delete `public/core/inputHandlers/*` entirely so we can stop maintaining an extra shim? Who/what still depends on those paths?
