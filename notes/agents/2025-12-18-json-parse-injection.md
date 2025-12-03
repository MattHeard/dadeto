Moved the `parseJsonValue` wrapper around `JSON.parse` into dependency-injected call sites, then relocated `parseJsonOrDefault`, `maybeRemoveNumber`, `maybeRemoveKV`, and `hideAndDisable` into `src/core/browser/browser-core.js` so the browser helpers rely on a centralized utility layer while `safeParseJson` still guards parsing failures.

Unexpected hurdles:
- I had to juggle the repeated `parseJsonValue` definition across modules because `parseCluesOrDefault` and `parseFleet` live outside `jsonUtils`, yet the change request wanted them to inject a parser into `safeParseJson`. Keeping a local arrow in each function and removing the inline fallback meant every caller now passes a parser explicitly.
- Moving `hideAndDisable` into `browser-core` required re-exporting it from `inputState.js` so the generated `public` handlers could continue to import from there without regressions.

Learnings:
- When adding dependency injection to a utility like JSON parsing, keep overrides localized to the functions that actually swap behavior; if you later remove the default, make sure every consumer supplies a parser so nothing breaks.
- Re-exporting a new central helper through legacy modules can keep generated artifacts working while the real implementation moves elsewhere.

Open questions:
- Should more helpers start consuming `parseJsonOrDefault` directly from `browser-core` instead of the `jsonUtils` re-export?
- Do other selector-specific cleanup helpers also belong in `browser-core`, or should we keep ejecting them near the DOM selectors they reference?
