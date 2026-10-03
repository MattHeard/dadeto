# Writer-store read and workflow transaction owners

Strict clone elimination reduced 100 to 98 without configuration or ignore
changes. The document store now owns its missing-file policy in readOptionalFile:
both filesystem reads and decoding remain inside the same catch boundary,
only ENOENT selects the caller's fallback, and other failures are rethrown.
Text callers retain an empty-string fallback; workflow callers retain null
and then bootstrap from the legacy document.

Load and cursor-navigation operations share updateStoredWorkflow, which orders
ensure, transformation, persistence, and serialization. Moving past the final
draft still appends before clamping. Loading does not add a cursor mutation.

Unexpected hurdle: JSDoc typeof on a parameter was not supported by the checked
JavaScript type resolver. Use the actual ensureWorkflow result type instead;
the final static run validates it without suppressions.

Evidence: .tmp/document-store-transactions-tests.log records 33 passing tests
in two suites with exact 100% statements/branches/functions/lines for
documentStore.js. The malformed-workflow regression verifies SyntaxError,
one UTF-8 read, no legacy fallback, no directory creation, and no writes.
.tmp/document-store-transactions-scan.log records 98 strict clones, with no
remaining documentStore pair. .tmp/document-store-transactions-static-final.log
records all nine non-duplication gates passing and duplication98 only.

This is a pushed checkpoint, not aggregate goal completion. dadeto-aaou owns
the remaining strict clones and the final terminal npm run check acceptance.
