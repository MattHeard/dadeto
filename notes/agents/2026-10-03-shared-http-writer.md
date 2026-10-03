# Shared HTTP writer

Moderation reporting and API-key-credit v1 share `sendResponseBody` in `response-utils.js`. The helper sets status and calls the selected bound method on the returned response target. It preserves body identity, performs no coercion, and discards the writer return value as the original adapters did. Text sending is the default; the API-key adapter explicitly selects JSON only for non-array objects and retains its Allow header policy.

The first extraction removed the duplicated status/send chain but exposed API-key call-tail matches against submit-shared, leaving the count at 110. Explicit method selection centralizes both writer paths and removes that structural match without spelling tricks. Removed the touched API-key serialization suppression; no new ignore directives were added.

Evidence: `.tmp/shared-http-writer-final-tests.log` has 131 passing tests / 13 suites and exact 100% coverage across all four metrics for the three touched source modules. Direct tests assert status-first order, receiver binding, exact body identity for text and JSON, and undefined return. `.tmp/shared-http-writer-final-static.log` has nine passing gates with duplication alone failing at 109 clones (down from 110).

Prior checkpoint `ee4ca90578` full aggregate completed exit 1 solely for duplication at 110 clones: `.tmp/cloud-helper-tables-full-check.log`. All unit shards and nine browser tests passed (8.1 seconds). Exact merged coverage was lines 19,972/19,972; statements 20,778/20,778; functions 6,909/6,909; branches 9,790/9,790. This full proof predates the HTTP writer extraction and does not prove parent-goal completion.
