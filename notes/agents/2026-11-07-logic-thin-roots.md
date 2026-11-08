# Logic roots and thin integration policy

Owning bead: `dadeto-eg7y`; source is the active
[typed-logic architecture spec](https://app.notion.com/p/3ff700afc301811ab16fcfab82168d28).

The old status walker skipped only legacy `src/core`. Real filesystem fixtures
first failed eight of nineteen cases: destination logic counted as oversized
adapters, custom source roots and stale exemptions were misclassified, and pure
destination re-exports/build imports were rejected.

Derive exact logic directory paths from `LOGIC_SOURCE_ROOTS` relative to the
configured source directory. Join paths through the injected platform operation.
Do not skip the whole `src/logic` subtree: sibling helpers and names such as
`core-extra` remain integration code subject to the unchanged line limit.
Retain dependency-directory filtering, source-directory overrides, configuration
defaults, stale-exemption detection and adapter wrapper behavior. Recognize pure
re-exports from either destination namespace while retaining the legacy forms.

Build entrypoint import classification also recognizes both destinations. Its
first implementation imported the shared root list from `core/local`, which
correctly failed `core-build-no-core-sibling-deps`. Keep the small build-specific
import marker table with the build policy instead of waiving the domain rule or
moving unrelated source. Existing one-logic-import/environment-import cardinality
and direct-execution checks remain. Keep this table's real namespace fixtures
aligned with the canonical root-list discovery.

Both touched policies now have their old Stryker suppressions removed. The
complete-module evaluator includes static mutants and keeps threshold 100%:

```sh
node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/logic-thin-roots.stryker.config.mjs
```

Report: `reports/mutation/logic-thin-roots.json`. Inspect every terminal status
and embedded source before acceptance; dry-run success alone is insufficient.

## Evidence and next-time guidance

- Initial regression: `/tmp/dadeto-eg7y-red.log`, eight failed / eleven passed.
- Initial scoped tests covered status completely but left the exported build
  command uncovered. Add real configuration-read/report/error contracts rather
  than excluding that path. `/tmp/dadeto-eg7y-focused-final.log`: four suites /
  43 tests pass; both policies at 100% statements, branches, functions and lines.
- Initial static run failed only the forbidden build-to-local dependency;
  preserve `/tmp/dadeto-eg7y-static.log` alongside subsequent acceptance.
- Required aggregate and whole-module mutation outcomes are retained in the
  owning bead and PR. Do not treat an in-progress command as a passing gate.

The first full mutation run failed at 74.63%: 250 of 335 killed, 85 survivors,
no ignored mutants or timeouts. Retain its report as
`reports/mutation/logic-thin-roots.initial.json`. Add exact-limit and active
exemption cases, real wrapper path selection, UTF-8 configuration reads, and
changing-file behavior. A shape failure still matters when a file changes after
its size read; do not remove that independent status check as redundant.

Remove only equivalent work: every string has at least one split line, so the
positive-limit precondition adds nothing to the line comparison. Reuse
`countTextLines`. Function-name sets were used only for emptiness; a direct
line-start existence check preserves that heuristic. An optional await prefix
adds no invocation match beyond its final whitespace boundary. Pure re-export
regexes already accept whitespace, so collapsing it first adds no acceptance;
the full-line comment's greedy remainder needs no end anchor.

Before recording the compatibility expectation, independently load the original
`ebc01c0a41` policies and compare 10,306 outcomes: 2,405 wrapper strings at four
limits and 686 entrypoint strings. Every result matches the simplified policies.
The deterministic generator in `test/fixtures/logic-thin-legacy-cases.js` covers
empty/single/multiple spaces, tabs, LF, CRLF and Unicode line separators. The
legacy-contract test pins the original JSON-outcome SHA-256
`e7764243a42350c616a2eeac698b36912fd487f4c112efc3dcd4fe18680957f5`.
Intended destination-root changes are covered separately by real filesystem
fixtures. This is original-behavior evidence, not expectations blessed from the
new implementation. Hardened focused coverage passes 84 tests / five suites at
all-four 100%; the added legacy digest case also runs in the fresh mutation
evaluator. Its terminal result remains required.

This preflight does not move source, add exemptions, relax AllowEffects/native
rules or change the adapter limit. Before the first move, refresh the report
module's actual imports and parsing responsibilities; the old import-free
inventory is historical. Boundary extraction and trusted contracts must preserve
existing reporting behavior and internal error propagation.
