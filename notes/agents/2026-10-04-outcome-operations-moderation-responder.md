# Clone checkpoint: outcome operations and moderation composition

Owning bead: `dadeto-aaou`. Strict jscpd stays at `minTokens: 14`; no threshold,
exclusion, exemption, or ignore-pragma changes were made.

## Behavior retained

The Notion outcome store now binds named read/write operations to one context.
Filesystem callbacks are captured at construction in the original order, while
the path options stay live. The new regression replaces those callbacks after
construction, changes the directory between reads, mutates a returned outcome,
and changes the directory inside the awaited mkdir operation. It proves that
callbacks remain captured, normalized reads are fresh, and write-path resolution
still occurs after mkdir completes. The existing missing-file predicate owns
ENOENT interpretation; a named recovery operation preserves other failures.

Moderation endpoint construction now builds its responder before adapting it to
the HTTP handler type. It no longer nests responder creation inside two casts
and another factory. Regression assertions retain Firebase-before-auth setup,
auth-before-environment reads, route registration before cloud wrapping, and
returned handler identity.

## Hurdles and next-time guidance

The first persistence extraction passed tests but violated the existing four-
parameter limit. A bound context resolves the warning without an exemption.
Its report then exposed a replacement error-tail match with the document store;
separating outcome recovery removed that tail but exposed a shared import match
with Symphony workflow loading. Count reduction must be measured globally, not
inferred from disappearance of one pair. The import match remains explicit debt
in the fresh report. The total reduction in this checkpoint comes from the
moderation composition change; persistence supplies a tested ownership seam for
the remaining work, not a claim that its entire clone family is finished.

## Evidence

- `.tmp/outcome-moderation-final-tests.log`: seven tests across two suites pass;
  exact 100% lines/statements/functions/branches for the outcome store and
  moderation entrypoint.
- `.tmp/outcome-moderation-final-lint.log`: `npm run lint` exits 0.
- `.tmp/outcome-moderation-static.log`: `npm run check -- --skip-tests` exits 1
  solely for duplication, down from 18 to 17 clones. All nine other gates pass.
- Final aggregate: `TMPDIR=/home/matt/dadeto/.tmp
  DADETO_COVERAGE_SHARD_SIZE=40 npm run check`, artifact
  `.tmp/outcome-moderation-full-check.log`.
- Build artifacts: `.tmp/outcome-moderation-build.log` and
  `.tmp/outcome-moderation-cloud-build.log`.
- Both builds terminate with exit 0. The full aggregate terminates with exit 1
  solely for duplication at 17 clones; all 21 test shards pass and the outer
  ten-gate summary has exactly one failure. Exact global coverage in
  `reports/coverage/coverage-summary.json`: lines 20346/20346, statements
  21201/21201, functions 7081/7081, branches 10198/10198. The goal remains active
  until zero clones and a completely green full check.
