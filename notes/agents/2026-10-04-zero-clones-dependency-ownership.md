# Zero-clone checkpoint: explicit dependencies and browser policy ownership

Owning bead: `dadeto-aaou`.

## Changes

Five remaining strict matches were repeated shared dependency declarations. One
consumer in each pair now qualifies calls through a module namespace: outcome
recovery, Notion launch lifecycle, render-contents support, cyclomatic parser
policy, and build-copy support. Implementations and compatibility exports remain
shared; no wrapper duplicates a rule or broadens an export surface.

The browser-main special scan now belongs to the existing browser-policy module,
alongside preamble stripping, global reference filtering, and relative paths.
The gate retains its original public scan entrypoint by binding the same source
root, scope defaults, and global allowlist. Caller overrides still take precedence.

Copy helper construction prepares the project-root binding once. Target paths
and the captured injected relative operation are supplied only when formatting
is requested; creation performs no path operation.

## Regression contracts

- Outcome failures propagate with their original identity.
- Launchers accept frozen options and retain shared prompt conversion policy.
- Every factor analysis receives the original shared parser-options object.
- Browser-main scans accept frozen inputs, honor custom source roots, return
  fresh records, retain default scope behavior, and propagate reader failures.
- Copy path formatting captures the injected operation once without invoking it
  at construction, alongside existing copy readiness and parallelism coverage.

## Hurdle and next-time guidance

At `minTokens: 14`, repeated named dependency declarations and short call tails
can be reported across comments. Namespace qualification makes the dependency
owner explicit without changing the scanner or moving rules into new facades.
Always rescan after formatting: reflow exposed a replacement path-call tail,
which required separating factory-time binding from per-target formatting.
Counts moved 6 -> 5 -> 4 -> 3 -> 2 -> 1 -> 0. The final report has both zero
statistics clones and an empty duplicates list.

## Acceptance evidence

Strict configuration remains unchanged (`src/core`, strict mode,
`minTokens: 14`). No exclusion, exemption, ignore pragma, or threshold weakening
was added. The source diff contains no new suppression directive.

- `.tmp/six-clones-final-tests.log`: 84 tests across seven suites pass with
  exact 100% focused coverage of all seven changed source owners.
- `.tmp/six-clones-bound-path-tests.log`: final copy regression, 15 tests,
  exact 100% coverage.
- `.tmp/six-clones-bound-path-lint.log`: explicit lint exits 0.
- `.tmp/six-clones-zero-duplication.log`: exits 0, reporting
  `Checked duplication report: 0 clones.`
- `.tmp/six-clones-zero-static.log`: exits 0; aggregate summary passed,
  total 10, failed 0.
- `.tmp/six-clones-zero-build.log` and
  `.tmp/six-clones-zero-cloud-build.log`: site and cloud builds exit 0.
- `.tmp/six-clones-zero-writer-smoke.log`: isolated port-14321 writer starts;
  `/writer/` returns HTTP 200, response saved in
  `.tmp/six-clones-zero-writer.html`. Only this instance's verified process tree
  was stopped; the existing writer was left untouched.
- Full aggregate acceptance: `TMPDIR=/home/matt/dadeto/.tmp
  DADETO_COVERAGE_SHARD_SIZE=40 npm run check`, artifact
  `.tmp/six-clones-zero-full-check.log`.

The full run terminates with exit 0: outer total 10, failed 0. All 21 unit
shards and nine browser tests pass. Exact global coverage: lines 20349/20349,
statements 21207/21207, functions 7083/7083, branches 10198/10198.

The broader bead audit also found two pre-existing ESLint pragmas in the browser
main integration test and static JSONL table fixture. This green checkpoint does
not prove that broader no-active-exceptions criterion; those test exemptions must
be removed and terminal acceptance repeated before closure.
