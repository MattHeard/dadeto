## Observations
- The dendrite-story handler now lives in `browser-core`, mirroring the page handler setup, so the toys bundle and tests can depend on the shared helper without touching the legacy shim.
- After rebuilding, the generated `public/` copies are consistent with the new import surface and no longer declare their own `DENDRITE_FIELDS` constant.

## Lessons and follow-ups
- Consolidating these handlers in `browser-core` keeps the API cohesive and makes it easier to delete redundant shims once consumers are updated.
- Keep the shim files around until you’re sure no downstream tooling references them; the re-exports can stay if we ever need to honor the old path again.

## Open questions
- Can we remove any other input handler shims in `src/browser/inputHandlers/` now that all consumers import directly from `browser-core`?
