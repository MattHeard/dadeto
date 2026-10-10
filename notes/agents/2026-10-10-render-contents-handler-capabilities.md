# Render contents handler capability split

- Unexpected hurdle: `createRenderContentsHandler` carried Firestore lookup and output rendering settings in one five-field options bag, while its fetcher caches needed to remain scoped to each handler instance.
- Diagnosis: the closure owns the caches, so the decomposition can split query dependencies from output configuration without moving cache state or changing fetcher precedence.
- Fix: split the factory into query dependencies (`db`) and output configuration (save adapter, object prefix, invalidation callback, page size); retained caches and behavior.
- Evidence: focused Jest passed (4 suites, 74 tests); fresh no-cache bag scan fell from 9 findings to 8; `npm run check` passed all 10 gates, including 100% coverage and 11/11 local E2E; `npm run build:cloud` passed. Logs and scan report are in `.tmp/`.
- Next-time guidance: continue the per-file scan with `resolveFetcher`, preserving override precedence and lazy per-handler caching; do not add suppressions.
