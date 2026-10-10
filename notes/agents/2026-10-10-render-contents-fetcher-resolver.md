# Render contents fetcher resolver

- Unexpected hurdle: the five-field `resolveFetcher` options bag combined override selection with per-handler lazy caching.
- Diagnosis: each handler needs two independently cached fetchers, while each invocation may override either one; a resolver closure can own one cache and accept only that invocation's optional override.
- Fix: build one resolver per fetcher factory when creating the handler. Each resolver preserves override precedence and lazily creates/caches the Firestore-backed fetcher. Removed the former bag-based resolver helpers.
- Evidence: focused render-contents Jest passed (4 suites, 74 tests); fresh no-cache scan dropped from 8 to 7 findings; elevated `npm run check` passed all 10 gates, including coverage and local E2E; `npm run build:cloud` passed. Logs and scan report are in `.tmp/`.
- Next-time guidance: continue with `publishStoryPages`, keeping pagination, object-prefix selection, cache metadata, storage writes, and invalidation paths intact.
