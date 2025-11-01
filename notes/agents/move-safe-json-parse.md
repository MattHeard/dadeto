# Safe JSON parsing helper relocation

- **Surprise:** `createSectionSetter` defined its own `safeJsonParse`, but `browser-core.js` had no shared helpers yet. I double-checked for existing shared modules to avoid duplicating effort; `jsonUtils.js` exports a differently shaped `safeParseJson`, so importing it directly would have broken callers expecting `{ ok, message }` objects.
- **Debugging path:** I traced all `safeJsonParse` usages with `rg` to confirm only `createSectionSetter` and a toy relied on that signature. This let me move the helper into `browser-core.js` safely without rippling changes elsewhere.
- **Future tip:** When consolidating helpers, compare return shapes before reusing similarly named utilities. If signatures differ, park the shared version beside the consuming domain (`browser-core.js` here) and re-export if broader reuse emerges.
- **Follow-up question:** Would it be worth standardizing on one JSON result shape (`undefined` vs `{ ok, data }`)? A shared convention might simplify future refactors.
