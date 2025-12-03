## Observations
- Adding `defaultHandler` to `browser-core` simplified imports throughout the input paths; now only `browser-core` needs to track the shared helper, and the input handler shim simply re-exports from there.
- Moving the handler required importing `maybeRemoveDendrite` into `browser-core`, which is unusual because the browser core now directly depends on `removeElements`. That felt acceptable since it already imports other removers but is worth noting in case the dependency graph needs tightening.

## Lessons and follow-ups
- When promoting a handler into the shared core module, make sure the light wrapper files under `src/browser` keep re-exporting from the new home so downstream consumers (toys and the public build) keep working without touching their imports.
- Consider whether `browser-core` should expose more grouped helpers like `defaultHandler`, since it already owns the hide/remove utilities and can keep the API cohesive for other entry points.

## Open questions
- Do we want to eventually converge the `browser-core` helper set with `core/browser/inputHandlers` so every handler living in `browser-core` is still tested via a dedicated module, or is re-exporting enough for the current architecture?
