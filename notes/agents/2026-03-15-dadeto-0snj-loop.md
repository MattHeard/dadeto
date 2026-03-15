# 2026-03-15 dadeto-0snj runner loop
- unexpected hurdle: none—the remaining snapshot-like surface was the invalid-rating fallback in `test/toys/2025-12-14/moderatorRatingCounts.test.js`, so the rewrite stayed inside that file.
- diagnosis path: inspected the failing comparison and confirmed the helper returned `'[]'` strings for malformed inputs, so the smallest behaviour hook was to parse each output and assert the empty list semantics directly.
- chosen fix: introduced a local `parseResult` helper, parsed each invalid-input response, asserted the empty array each time, and reran `npm test` (jest with coverage plus coverage summary script) to record the green suite.
- next-time guidance: when snapshot-style fallbacks only protect an empty payload, parsing once and asserting `[]` keeps the test behaviour-focused without needing extra scaffolding.
