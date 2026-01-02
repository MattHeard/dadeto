# dadeto-oul

- Tightened the storage helper contracts: `isMissingStoredValue` is now a type guard so `deserializeJson` only hands strings to `JSON.parse`, `focusLens` uses a keyed setter without exposing a string fallback, and `NormalizedBlogDataDependencies.memoryLens` is documented as always provided after the in-memory fallback. These changes clear the strict-null complaints from the data stack.
- `npm run tsdoc:check` still fails (hundreds of pre-existing issues in the presenter/toy/cloud layers), but the new log no longer shows the localStorage/storageLens/data errors; we trimmed the targeted complaints and can now address the remaining noise in separate beads.
- Open question: should we postpone the next tsdoc flag until the presenter/toy/tooling area is cleaned up, or continue releasing strict-null checks in smaller slices?
