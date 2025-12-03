Moved the `parseJsonValue` wrapper around `JSON.parse` into dependency-injected call sites and then removed the fallback inside `safeParseJson`, requiring every consumer to supply its own parser.

Unexpected hurdles:
- I had to juggle the repeated `parseJsonValue` definition across modules because `parseCluesOrDefault` and `parseFleet` live outside `jsonUtils`, yet the change request wanted them to inject a parser into `safeParseJson`. I kept a local arrow in each function and removed the inline fallback from `safeParseJson`, so now every caller must pass a parser explicitly.

Learnings:
- When adding dependency injection to a utility like JSON parsing, keep overrides localized to the functions that actually swap behavior; if you later remove the default, make sure every consumer supplies a parser so nothing breaks.

Open questions:
- Should other modules that call `safeParseJson` be updated to pass their own parser as well, or is indexing the three explicitly requested sites enough for now?
- After relocating `parseJsonOrDefault` to `src/core/browser/browser-core.js`, should any other helpers consume it directly instead of through the shared `jsonUtils` re-export?
