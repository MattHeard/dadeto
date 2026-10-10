# Render contents page publisher

- Unexpected hurdle: `publishStoryPages` combined pagination state with output settings in a five-effective-argument options bag.
- Diagnosis: page size, storage writer, and object prefix are stable for the handler lifetime, so a publisher factory can capture them while leaving request permission and story items explicit per call.
- Fix: added `createStoryPagePublisher` and bound it once when creating the render handler. Preserved the one-page minimum, page naming, cache-control metadata, prefixed storage paths, and returned invalidation paths.
- Evidence: focused render-contents Jest passed (4 suites, 74 tests); fresh no-cache scan dropped from 7 to 6 findings; `npm run check` passed all 10 gates; `npm run build:cloud` passed. Logs and scan report are in `.tmp/`.
- Next-time guidance: continue with `respondToOrigin`, preserving wildcard handling for invalid/missing origins and allow/deny behavior for configured origins.
