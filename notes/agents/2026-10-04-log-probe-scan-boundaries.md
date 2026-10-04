# Clone checkpoint: request fields and process-probe policy

Owning bead: `dadeto-aaou`. Strict jscpd remains at `minTokens: 14`;
no threshold weakening, exemptions, exclusions, or ignore pragmas were added.

## Behavior and regressions

Request logging separates field projection from line serialization. The regression
uses a controlled clock and checks the complete fallback log line, including the
25ms duration and unknown remote address.

Process liveness separates probing from error recovery. ESRCH still means dead,
EPERM still means alive, and other failures propagate unchanged. The strengthened
regression checks error identity and the original two reads of an unexpected
error's code getter. Primitive failure coverage remains intact.

Browser scanner regression coverage now freezes dependency inputs and checks that
each scan returns fresh records unaffected by mutations of a previous result.
The scanner uses its existing shared violation typedef. Naming the collected
result and consolidating the contract did not remove the remaining closing-tail
clone; this is regression evidence, not a claimed clone reduction.

## Hurdle and next-time guidance

At this strict token floor, short import or statement tails can match across
comments even when function bodies differ. Inspect the report's actual token
boundaries after each change. Two scanner attempts left the count unchanged, so
stop that approach and take a new bounded ownership hypothesis rather than
rewriting comments or introducing suppression. The accepted refactors reduce
the total from 8 to 6; six reported pairs still require follow-up.

## Evidence

- `.tmp/log-probe-scan-final-tests.log`: 96 tests across four suites pass,
  with exact 100% coverage of request logging, process polling, and gate scanning.
- `.tmp/log-probe-scan-final-lint.log`: lint exits 0.
- `.tmp/log-probe-contract-static.log`: all nine non-duplication gates pass;
  duplication alone fails at six clones.
- `.tmp/log-probe-contract-build.log`: site build exits 0.
- `.tmp/log-probe-contract-writer-smoke.log`: isolated writer on port 14321
  starts successfully; `/writer/` returns HTTP 200, response recorded in
  `.tmp/log-probe-contract-writer.html`. Only that smoke process tree was stopped;
  the existing default writer was left running.
- Full aggregate command: `TMPDIR=/home/matt/dadeto/.tmp
  DADETO_COVERAGE_SHARD_SIZE=40 npm run check`, artifact
  `.tmp/log-probe-contract-full-check.log`: terminal exit 1 solely for duplication
  at six clones. All 21 unit-test shards and the browser-test gate pass; the outer
  ten-gate summary has exactly one failure. Global coverage is exact 100%:
  lines 20350/20350, statements 21208/21208, functions 7083/7083, and branches
  10198/10198. The goal remains active until zero clones and a fully green
  aggregate check are proven.
