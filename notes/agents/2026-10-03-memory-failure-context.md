# Memory request failure context

Strict duplication fell from 93 to 92 without ignores or threshold changes.
Memory reads and writes share runMemoryRequest in memoryVector, which preserves
the original normalized request, runs the caller's operation, and combines
formatThrownError with the caller's error result builder. A write still executes
the action before constructing success; reads retain projection overrides.

The browserToysCore facade re-exports the shared runToyFailureBoundary executor.
Its constant-fallback wrapper uses that executor while deliberately discarding
the error, retaining undefined and other falsy successes rather than treating
them as failure. The executor's generic result is a success/failure union:
structured read/write outcomes need not have identical properties.

Unexpected hurdles: merely sharing catch execution left the request-plus-error
composition clone in both callers. Sharing the full contextual operation removed
it. Type checking caught a too-narrow single-result generic (TS2741); separate
success/failure type parameters model the actual behavior without casts or
suppression. The original iteration's coverage pass was not static acceptance.

Evidence: .tmp/memory-request-boundary-tests-final.log records 1,272 passing
tests in 138 suites, exact 100% statements/branches/functions/lines for
browserToysCore, formatToyError, memoryVector, and memoryScalarVectorWrite.
Regressions verify successful undefined does not trigger constant fallback,
falsy success remains unchanged, and failure receives the exact original request.
.tmp/memory-request-boundary-scan.log records 92 clones;
.tmp/memory-request-boundary-static.log records all nine non-duplication gates
passing, including the corrected types; .tmp/memory-request-boundary-build.log
records successful generated assets.

dadeto-aaou remains active. A full-green terminal aggregate and exact global
coverage are still required at the final zero-clone implementation.
