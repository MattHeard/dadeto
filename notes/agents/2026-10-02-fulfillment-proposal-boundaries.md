# Fulfillment proposal boundaries

Normal, prefix and procurement-backed proposal toys now share the existing JSON parsing/failure boundary. The boundary accepts a caller-specific failure serializer: normal/prefix retain their original valid/error-only response, while procurement-backed uses the standardized valid/reason/error response. The legacy serializer deliberately preserves thrown-value `.message` behavior, including omitted messages for strings and rejection for null.

Normal and procurement-backed sequence serialization is shared separately, with caller-owned leading fields and an authored records object containing points, segments and operation metadata. Keep original response field order and normal-only `valid: true` intact. Group related sequence records rather than introducing a six-parameter helper; the strict lint gate rejected that intermediate interface.

The first parsing-boundary extraction did not lower the clone count. The report then identified the remaining response envelope duplication; extraction of that envelope lowered it. Do not claim clone reduction from a visually smaller diff alone.

Required focused coverage includes 2026-08-22, 2026-08-23 and `test/toys/2026-08-24/fulfillmentBoundaries.coverage.test.js`; the first folder alone does not exercise all of `fulfillmentResult.js`. Artifacts: `.tmp/proposal-boundary-tests.log`, `.tmp/proposal-boundary-coverage`, `.tmp/proposal-boundary-static-accepted.log`. Broader strict-14 cleanup remains in dadeto-aaou.
