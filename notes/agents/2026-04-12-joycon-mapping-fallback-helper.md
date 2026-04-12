# joyConMapping fallback helper

- Targeted mutant: `Null Halo` / mutant `89` in `src/core/browser/presenters/joyConMapping.js:204`.
- Change made: extracted `createFallbackMappingRecord(value)` so the fallback object shape is built in one place, while `createFallbackMapping(isSkipped)` keeps the skipped vs optional decision.
- Why this is useful: it gives future agents a smaller, clearer helper boundary around the fallback object literal instead of inlining the same `{ type, value }` shape in two branches.
- Validation: full `npm test` passed after the refactor.
- Status: applied in source; mutation report not rerun yet, so the surviving-mutant verdict is still based on the stale report.

