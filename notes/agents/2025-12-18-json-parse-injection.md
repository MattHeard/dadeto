Moved the `parseJsonValue` wrapper around `JSON.parse` into dependency-injected call sites and then removed the fallback inside `safeParseJson`, requiring every consumer to supply its own parser.

Unexpected hurdles:
- I had to juggle the repeated `parseJsonValue` definition across modules because `parseCluesOrDefault` and `parseFleet` live outside `jsonUtils`, yet the change request wanted them to inject a parser into `safeParseJson`. I kept a local arrow in each function and removed the inline fallback from `safeParseJson`, so now every caller must pass a parser explicitly.

Learnings:
- When adding dependency injection to a utility like JSON parsing, keep overrides localized to the functions that actually swap behavior; if you later remove the default, make sure every consumer supplies a parser so nothing breaks.

- After relocating `parseJsonOrDefault` to `src/core/browser/browser-core.js`, should any other helpers consume it directly instead of through the shared `jsonUtils` re-export?
- Does the `maybeRemoveNumber` cleanup helper deserve a more central home like `browser-core` since it’s shared between UI handlers, or should it stay next to the other selectors? I moved it into `browser-core` and updated the inputs/tests accordingly so the number remover is still reusable by `text`, `default`, `textarea`, `dendrite`, and later `handleKVType`.
- Now that `maybeRemoveKV` also lives in `browser-core`, the UI handlers share a single KV cleanup helper alongside the number remover—worth noting in case more selector-specific cleanup gets centralized further.
- After relocating `parseJsonOrDefault` to `src/core/browser/browser-core.js`, should any other helpers consume it directly instead of through the shared `jsonUtils` re-export?
