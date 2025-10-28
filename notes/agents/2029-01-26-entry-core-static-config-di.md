# Entry/Core Static Config Loader Injection
- **Challenge:** Ensuring the static config loader followed the entry/core dependency-injection vision while preserving its memoization semantics.
- **Resolution:** Moved the promise caching logic into the core module behind a `createLoadStaticConfig` factory and updated the browser entry to wire in `fetch` and `console.warn` so behavior stayed identical.
