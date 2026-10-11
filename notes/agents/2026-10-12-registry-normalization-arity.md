# Registry normalization arity cleanup

- Unexpected hurdle: TSDoc found `buildRegistry` callers in the 2026-08-19 and 2026-08-22 point registries beyond the first 2026-08-18 search scope.
- Diagnosis: `buildRegistry` combined collection parsing/normalization/stable sorting with collection/count serialization. That output-shaping work is already represented by `serializeRegistry`.
- Fix: extracted `normalizeRegistryCollection(input, sourceKey, normalize, sortKey)` to return sorted normalized records; migrated every caller to serialize explicitly. No parameter bag or lint suppression remains.
- Evidence: eight focused suites passed (58 tests); ESLint and TSDoc passed; the target lint scan has 0 findings; fresh global scan fell from 22 findings/22 files to 21/21 (`.tmp/parameter-bag-global-after-registry-utils.json`); `npm run check` passed all 10 gates including 11 local E2E tests and 0 clones; `npm run build` and `git diff --check` passed.
- Next time: start from the fresh global rule report. Next finding is `src/core/browser/toys/2026-08-20/assignmentIntervals.js:183` (effective arity 6). Inspect whether the function mixes assignment interval concerns before choosing the next semantic split.
