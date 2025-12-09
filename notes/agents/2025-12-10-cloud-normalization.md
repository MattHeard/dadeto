# Cloud Normalization Duplication

Ran the updated duplication report and found the `normalizeHeaderValue` helper in `cloud-core` was still mirrored by `normalizeOptionalString` in `process-new-story-core`. I expected to pull the helper into jsonUtils and share it with Tic Tac Toe, but the mutant test that loads the source via a `data:text/javascript` import can’t resolve relative imports, so that approach broke the suite and had to be rolled back.

Instead I lean on the public API we already export from `cloud-core` and import it into `process-new-story-core`. Replacing the local helper with `normalizeHeaderValue` removes the clone group without touching the toy arena and keeps the mutant tests happy.

Lessons learned: avoid adding fresh cross-file imports in modules that some tests evaluate from a data URI, or adjust those tests first. Also, the remaining jscpd clones are still in the toy world (e.g., Tic Tac Toe vs. calculateVisibility) and the cloud `normalizeNonStringCandidate` usages; they can be revisited once we either change the duplication threshold or find a shared abstraction that works for those files.

Open questions:
- Should we add a shared normalization helper for the toy modules, or is it better to leave them standalone because of how they’re tested?
