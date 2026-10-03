# Clone checkpoint: cleanup plans and simulator readiness

Owning bead: `dadeto-aaou`. Strict jscpd remains at `minTokens: 14`, without
threshold changes, exclusions, exemptions, or ignore pragmas.

## Changes and behavior contracts

Shared input cleanup now prepares its dependency plan separately from execution.
The existing cleanup regression proves repeated extra callbacks are not deduped,
receive the exact container and DOM objects, and run before the base DOM queries.
Default extra-handler behavior remains covered.

Simulator startup now initiates listening through a named operation, separating
listen initiation from Promise completion. The injected-server test holds the
listen-ready callback, proves startup stays pending until notification, then
checks that the exact returned server resolves. Existing integration tests boot
the actual simulator listener and exercise HTTP behavior; route setup, static
assets, server address handling, and fallback-port logging retain coverage.

## Diagnosis and next-time guidance

The strict report matched nested object-call and callback closing tails between
unrelated modules. Keep the shared cleanup executor and simulator ready resolver
as the behavioral owners. Separate preparation from execution instead of copying
those operations or suppressing source regions. Measure the net result using
fresh reports: this batch moved 14 -> 13 -> 12 clones without replacement growth.

## Evidence

- `.tmp/cleanup-listen-final-tests.log`: 23 tests across four suites pass;
  exact 100% lines/statements/functions/branches for browser utilities and the
  simulator server, including unit and real HTTP integration coverage.
- `.tmp/cleanup-listen-final-lint.log`: explicit `npm run lint` exits 0.
- `.tmp/cleanup-listen-static.log`: `npm run check -- --skip-tests` exits 1
  solely for duplication at 12 clones; all nine other gates pass.
- Full checkpoint command: `TMPDIR=/home/matt/dadeto/.tmp
  DADETO_COVERAGE_SHARD_SIZE=40 npm run check`, artifact
  `.tmp/cleanup-listen-full-check.log`.
- Build command: `npm run build`, artifact `.tmp/cleanup-listen-build.log`.
- The build terminates with exit 0. The full aggregate terminates with exit 1
  solely for duplication at 12 clones; all 21 test shards pass and the outer
  ten-gate summary has exactly one failure. Exact global coverage from
  `reports/coverage/coverage-summary.json`: lines 20350/20350, statements
  21206/21206, functions 7082/7082, branches 10198/10198. The goal remains active
  until zero clones and a fully green full check are proven.
