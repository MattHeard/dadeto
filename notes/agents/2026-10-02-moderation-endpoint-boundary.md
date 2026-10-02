# Moderation endpoint failure boundary

The endpoint loader had multiple private helpers that merely forwarded the same loader/default/logger arguments, plus repeated structural endpoint types. Keep the public API and memoized promise identity; express the endpoint/logger contracts once and handle loader and mapping failures in a single asynchronous boundary.

Missing loaders still return a fresh fallback through `Promise.resolve` without logging. Explicit configuration values, including undefined, still override defaults. Both synchronous loader failures and mapping getter failures are logged exactly once and resolve fresh defaults. A logger failure must reject rather than be swallowed. Dedicated tests now encode those less-obvious contracts.

Evaluator artifacts: `.tmp/moderation-endpoints-tests.log` and `.tmp/moderation-endpoints-coverage` for focused tests/exact coverage; `.tmp/moderation-endpoints-static.log` for the unchanged aggregate static gates. Quality hardening remains owned by dadeto-aaou until the full aggregate is completely green.
