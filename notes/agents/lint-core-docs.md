Cleared the remaining JSDoc warnings across the core helpers so future lint runs focus on the complexity budget instead of missing docs.

- Added proper `@returns`/`@param` descriptions for `load-static-config-core`, pushing the validation helpers’ docs to describe the actual types and return values.
- Documented every toy helper in `addDendritePage` and the CSV utility so their payload/response shapes are stated explicitly; `parseHeaderEntries` now explains when it returns metadata versus `null`.
- Taught `cloud-core`, `generate-stats-core`, `get-moderation-variant-core`, and `hide-variant-html-core` about their inputs again (actual parameter names, dependency bags, and the concrete types used), which removed the ~40 root0/missing-type warnings.

Tests: `npm run lint`, `npm test`.

Open questions:
1. Since the remaining warnings are entirely `complexity`/`max-params`, should we refactor the larger helpers incrementally or adjust the lint thresholds for the deep cloud logic?
2. Do we want to codify in a lint rule or template that multi-line doc blocks must sit directly in front of their functions to avoid future `root0` noise?
