# Completion audit: zero clones without inline lint exemptions

Owning bead: `dadeto-aaou`. Previous zero-clone checkpoint: `7505643f38`.

## Unexpected hurdle and diagnosis

The first full zero-clone aggregate passed, but searching only for
`eslint-disable` missed trailing `eslint rule: off` settings. The broader bead
requires no active ESLint source/test exceptions. Enabling `noInlineConfig`
exposed those settings and their hidden oversized test bodies.

The no-inline guardrail initially used `no-undef` as its probe. That rule is not
enabled in the effective repository configuration. The corrected regression uses
the enabled `no-unused-vars` rule and checks both the underlying violation and
the warning that an inline directive cannot disable it. Warnings fail the real
lint command through its existing zero-warning policy.

## Chosen fixes

All active ESLint/global configuration comments were removed. Test assertions
were retained while independent gamepad lifecycle, document metadata, table
rendering, and dated-toy phases were separated. Initialization and fallback-style
assertions use named helpers instead of suppressing statement limits. The dated
boundary matrix has separate top-level groups rather than one oversized callback.
JSONL fixture parameters and return values are documented.

Two source comments had tightened complexity to four rather than exempting code.
Those exact limits now live centrally in `eslint.config.js`; regressions prove
both remain enforced. No complexity limit was weakened. Central no-inline policy
prevents future source/test comments from silently overriding lint rules.

## Next-time guidance

Use the effective lint evaluator with inline configuration forbidden rather than
only grepping for one pragma spelling. Keep strict directives that tighten policy
in central configuration, and distinguish test fixture strings from active
source comments. A green aggregate alone is insufficient when bead acceptance
also requires the absence of exceptions.

## Evidence

- `.tmp/zero-clones-no-exceptions-verified-tests.log`: all six companion suites,
  22 tests, pass with exact 100% browser-main and JSONL table coverage.
- `.tmp/no-inline-all-rules-tests.log`: six refactoring/guardrail suites,
  47 tests, pass with all retained behavioral scenarios.
- `.tmp/no-inline-all-rules-final-lint.log`: explicit lint exits 0; lint report
  is empty with inline configuration forbidden.
- `.tmp/no-inline-final-build.log` and
  `.tmp/no-inline-final-cloud-build.log`: site and cloud builds exit 0.
- Anchored active ESLint/global comment search returns no matches. Core-parse
  exemptions are empty. `.jscpd.json` remains unchanged at strict `minTokens: 14`.
- Final aggregate: `TMPDIR=/home/matt/dadeto/.tmp
  DADETO_COVERAGE_SHARD_SIZE=40 npm run check`, artifact
  `.tmp/no-inline-zero-clones-full-check.log`.

Final command terminates with exit 0. Outer ten-gate summary: passed, failed 0.
All 21 unit-test shards and nine browser tests pass. Exact global coverage:
lines 20349/20349, statements 21207/21207, functions 7083/7083, and branches
10198/10198. The final clone report has zero statistics clones and zero duplicate
records. Active inline-config search is empty; core-parse and non-core-thin
exemption maps are empty. Strict jscpd configuration remains unchanged.

This supersedes the previous checkpoint's outstanding exception audit. The
original complexity limits remain enforced, while no inline configuration can
hide future violations. Final acceptance is recorded in `dadeto-aaou` before
landing the commit through pull/rebase, bead sync, push, and clean-status checks.
