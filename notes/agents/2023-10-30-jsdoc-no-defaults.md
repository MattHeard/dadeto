# JSDoc no-defaults cleanup

- Running the repository lint script with `--fix` produced a massive warning list without obvious jsdoc hits in `src/core`. I initially suspected there were none.
- Regenerated lint output in JSON format scoped to `src/core` and parsed it with `jq`, which surfaced the hidden `jsdoc/no-defaults` warnings in `process-new-page-core.js` and a couple of other modules.
- Updated that file's documentation by removing inline default annotations and noting defaults in prose, which cleared the rule while preserving clarity.
