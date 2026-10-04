# Clone checkpoint: copy tasks and lazy header candidates

Owning bead: `dadeto-aaou`. Strict jscpd remains at `minTokens: 14`, without
threshold, exclusion, exemption, or ignore-pragma changes.

## Changes and regression contracts

Individual file copying uses the existing parallel mapped-task executor and a
named per-file operation. That operation waits for the destination directory,
prepares the copy/log request, then invokes the existing copy/log policy. The
strengthened regression holds both directory promises, proves both tasks start
before either is ready, and verifies no copy occurs early. Completion, paths,
and log records retain their existing assertions.

Submission debug headers use lazy nullable accumulation over the original and
lowercase names. The candidate interpreter remains unchanged. Table-driven
getter assertions prove first valid values require only one read, while invalid
values retain the two reads of duplicate lowercase candidates. Existing arrays,
empty values, whitespace, Express-getter fallback, and debug logging tests stay
covered.

## Hurdles and next-time guidance

`test/core/copy.test.js` targets another copy module; its passing tests produced
zero coverage of the intended owner. The correct focused suite is
`test/core/cloud/copy.test.js`, which imports `src/core/build/copy.js`. Check
imports rather than trusting a matching filename. The first task extraction
exposed a replacement copy/log closing-tail match within the same file. Preparing
the copy request separately after directory readiness removed that match without
changing method access timing. Net strict counts moved 10 -> 9 -> 8.

## Evidence

- `.tmp/copy-header-final-tests.log`: 28 tests across two suites pass; exact
  100% lines/statements/functions/branches for build copying and the submission
  entrypoint, with readiness and getter-read regressions.
- `.tmp/copy-header-final-lint.log`: explicit `npm run lint` exits 0.
- `.tmp/copy-header-static.log`: `npm run check -- --skip-tests` exits 1 solely
  for duplication (8 clones); all nine other gates pass.
- Full checkpoint: `TMPDIR=/home/matt/dadeto/.tmp
  DADETO_COVERAGE_SHARD_SIZE=40 npm run check`, artifact
  `.tmp/copy-header-full-check.log`.
- Site/cloud builds: `.tmp/copy-header-build.log` and
  `.tmp/copy-header-cloud-build.log`.
- Both builds terminate with exit 0. The full aggregate terminates with exit 1
  solely for duplication at 8 clones; all 21 test shards pass and the outer
  ten-gate summary has exactly one failure. Exact global coverage from
  `reports/coverage/coverage-summary.json`: lines 20348/20348, statements
  21204/21204, functions 7082/7082, branches 10198/10198. The goal stays active
  until zero clones and a fully green aggregate check are proven.
