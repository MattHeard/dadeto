# Scoped impact clone diagnostics

- **Unexpected hurdle:** the scoped executor ran ESLint and `core-parse` for changed core files but omitted duplication; the existing duplication failure only reported a count and the JSON report path.
- **Diagnosis:** duplication is a core-wide gate in `.jscpd.json`. Reusing `npm run duplication` preserves the current scanner and zero-clone policy; the impact report should state that this scans all of `src/core`, not only changed files.
- **Fix:** changed `src/core` plans include and execute `npm run duplication`. Duplication failures print up to five validated file/line-range pairs and continue to link the complete JSON report.
+ **Validation:** focused planner, impact-executor, and duplication tests passed (3 suites, 47 tests). `npm run check` passed all 10 gates; its five serial test shards passed 955 suites and 6,514 tests. The duplication gate reported 0 clones in `reports/duplication/jscpd-report.json`. An initial check caught a TSDoc error because TypeScript did not narrow unknown line fields after `Number.isSafeInteger`; explicit numeric guards fixed it.
- **Next-time guidance:** keep the fast impact runner no-coverage and make conservative fallback explicit. Treat the full `src/core` scan as diagnostic feedback; `npm run check:full` remains authoritative for whole-repository coverage and E2E.
