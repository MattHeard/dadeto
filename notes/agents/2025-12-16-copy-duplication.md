## Copy helpers deduplicated

- **Unexpected:** The duplication report kept pointing at the two copy loops inside `src/core/copy.js` (root utilities vs presenter files). They differed only by the message text, so fixing the clone required extracting a helper that could handle both flows without duplicating the loop logic.
- **Diagnosis:** Introduced a `copyEntries` helper at `src/core/copy.js` that iterates entries, looks up the message text via a resolver, and delegates to `copyFileWithDirectories`. Both the root utility and presenter copy functions now call this helper with their specific message resolver, so there is a single place where the actual copy logic lives.
- **Next steps:** The duplication report still shows the toy CSV parser and other presenter/toy overlaps—those can be addressed with similar extractors even when the helpers look alike but have subtle differences.

**Testing**
1. `npm run duplication`
2. `npm test`
