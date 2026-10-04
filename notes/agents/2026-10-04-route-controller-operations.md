# Clone checkpoint: async routes and permanent-state operations

Owning bead: `dadeto-aaou`. Strict jscpd stays at `minTokens: 14`, with no
threshold, exclusion, exemption, or ignore-pragma changes.

## Changes and regression contracts

Symphony route construction binds a named execution operation rather than
returning a nested async callback. The strengthened reader-error test verifies
that the operation forwards the exact error to Express once, completes with
undefined, and does not write a JSON response.

Permanent-state controller methods bind named read/write operations once, while
their dependency accessor remains lazy and memoized. The strengthened lens test
checks no eager dependency creation, public method arities zero/one, ignored
extra call arguments, one dependency-factory call across reads/writes, and fresh
reads from the current lens. Existing merge, normalization, logging, and error
contracts retain coverage.

## Hurdles and next-time guidance

Initially reusing the generic dependency wrapper passed existing tests, but
inspection showed that it forwarded extra arguments unlike the original
permanent methods. Fixed-arity bound operations preserve that contract without
changing the generic wrapper or relying on callers to omit extras.

The route response double uses a plain `json` method, so a Jest call matcher
requires a scoped spy. An overly broad patch placed that spy in an earlier
launch test, causing ReferenceErrors and a consequent coverage gap. Anchor
fixture edits to the unique strengthened invocation, not a repeated variable
declaration. The final scoped rerun is the authoritative focused evidence.

## Evidence

- `.tmp/route-controller-scoped-tests.log`: 86 tests across eight suites pass;
  exact 100% lines/statements/functions/branches for browser data and Symphony
  app operations.
- `.tmp/route-controller-scoped-lint.log`: explicit `npm run lint` exits 0.
- `.tmp/route-controller-static.log`: `npm run check -- --skip-tests` exits 1
  solely for duplication, down from 12 to 10 clones; all nine other gates pass.
- Full command: `TMPDIR=/home/matt/dadeto/.tmp
  DADETO_COVERAGE_SHARD_SIZE=40 npm run check`, artifact
  `.tmp/route-controller-full-check.log`.
- Site build: `npm run build`, artifact `.tmp/route-controller-build.log`.
- Local runtime smoke: the default writer port was occupied; the existing
  listener was left untouched. `WRITER_PORT=14321 npm run start:writer:playwright`
  started successfully (`.tmp/route-controller-writer-isolated.log`), and
  `curl --fail http://127.0.0.1:14321/writer/` returned HTTP 200 (response artifact
  `.tmp/route-controller-writer.html`). The smoke-only process tree was stopped
  after probing. The standard writer does not mount the optional Symphony app;
  its status route returned 404 there, so the app harness, not this smoke, proves
  changed Symphony route behavior.
- The build terminates with exit 0. The full aggregate terminates with exit 1
  solely for duplication at 10 clones; all 21 test shards pass and the outer
  ten-gate summary has exactly one failure. Exact global coverage from
  `reports/coverage/coverage-summary.json`: lines 20349/20349, statements
  21205/21205, functions 7080/7080, branches 10198/10198. The goal remains active
  until zero clones and a fully green check.
