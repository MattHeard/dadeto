# Parse classifier injection

Bead: `dadeto-qoi0`; parent `dadeto-e1oz`; Rank 11 remains Active / Partial.

## Diagnosis and bounded fix

The older `dadeto-8f5t` requested replacing regex extraction with the AST
classifier and adding review signals. Live source and its July implementation
receipt prove that is already done; focused classifier/gate tests pass 14 cases.
Close that stale original task instead of forcing another classifier rewrite.
The distinct remaining coupling is the core gate importing child_process/URL and
reading process cwd/executable to start a Node subprocess for every source file.

The three local wrappers now supply the existing classifyFunctionsFromSource
function directly. Configured scans require a precisely typed classifySource
callback; classifiers receive exactly the original source, with no additional
filename argument. Parser/validator precedence, order, exemptions, legacy roots
and diagnostic strings are preserved. Missing/failing dependencies propagate as
programming errors; classifier exceptions are no longer wrapped by a child
process failure. The legacy no-options scan remains inert; its unused default
classifier explicitly throws if invoked for actual work.

An independent unit suite uses controlled classifier results on deliberately
invalid JavaScript and imports no actual parser. Existing integration fixtures
may inject the real classifier. No framework import enters core. The touched
module's blanket mutation disable/restore pair is removed, with no new skip,
source exclusion, timeout change or weaker threshold.

## Evidence

Four initial injection tests failed on the old implementation. Final focused
classifier/integration/fake-gate tests pass 3 suites / 19 cases, plus targeted
ESLint and checkJs. Scoped impact coverage collects the changed core module with
no uncovered lines/branches; lint/core-parse/duplication pass with zero clones.
All ten split local static gates pass after explicit focused tests.

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --coverage=false test/classify-functions.test.js test/scripts/check-core-parse.test.js test/scripts/check-core-parse-injection.test.js
npm run check:impact:run -- --files src/core/scripts/check-core-parse.js
npm run check -- --skip-tests
npm run core-parse
node src/local/check-core-parse.js
node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/parse-gate.stryker.config.mjs
```

The two real parse CLI wrappers produce byte-identical stdout before/after; the
aggregate third wrapper preserves the same two diagnostic lines. One informal
local sample measured 8.952s before and 1.168s after; this is not a controlled
benchmark or a guaranteed speedup. Receipts:
`/tmp/dadeto-qoi0-core-parse-{before.log,before.json,after.log,parity.json}` and
`/tmp/dadeto-qoi0-aggregate-cli.log`.

The full-module static-enabled 100% mutation harness is
`docs/quality/parse-gate.stryker.config.mjs`; inspect its terminal report before
claiming success. Logs: `/tmp/dadeto-qoi0-{red,focused-final,impact,static,mutation}.log`.
The fresh AST inventory leaves 9 legacy modules / 21 direct built-in imports;
that count excludes dynamic/JSDoc imports and host globals. No JavaScript source
has moved to the new namespaces. Parse/thin root classification and broader
migration still remain unfinished.

Next time: check whether an old task's requested wiring already exists before
rewriting it; inject the existing classifier at integration instead of retaining
subprocess coupling. Fake-result tests should exercise gate policy without a
parser dependency; keep real-classifier integration coverage separately.

## First mutation failure and tighter evaluator

Whole-module baseline: 69 Killed / 11 Survived / zero Timeouts among 80 mutants,
including five static survivors; score 86.25%. Retain the initial report at
`reports/mutation/parse-gate.initial.json`. The old exemption fixture was already
excluded by the boundary regex, while its skipped parser fixture did not produce
a parser label, so full branch coverage did not distinguish the skip policies.

Use a fake classifier that definitely reports a violation to prove each boundary
category and a non-boundary exemption independently skip classification. Exercise
root-relative index/main and integration folders with an explicit empty scan
root, suffix lookalikes, UTF-8 reads and both exact success messages. Remove two
redundant outer default option objects: normalizeOptions alone owns defaults, so
forwarding undefined preserves the same inert scan and required classifier.

Final focused hardening passes 3 suites / 37 tests, targeted ESLint and checkJs.
The full-module rerun remains required; no survivor is suppressed. Existing scan
roots, regex policy and exemptions are unchanged. This prepares the later
namespace policy extension; it does not claim that extension is done.

## Final mutation and build receipt

The full-module rerun passes: 78/78 Killed, including
17 static mutants, zero survivors/timeouts/ignored/uncovered mutants
at the unchanged 100% threshold. The report embeds the exact runtime source;
SHA-256 `3a0745a5ef4b3206a65490a91a0e9fefbdfe99660cdfc847b914ffdebd2988b5`. Reports:
`reports/mutation/parse-gate.json`, `reports/mutation/parse-gate-summary.json`.
The 11 original survivors prompted stronger independent fixtures; only the two
proven redundant forwarding defaults were removed, leaving one normalization
owner. No policy/exemption/source/mutation exclusion or threshold changed.

Final scoped run: 2 suites / 33 tests, collected source, no uncovered lines or
branches; all ten split local static gates and the actual build pass. A final
3-suite / 37-case rerun after fixture JSDoc cleanup and a fresh exact CLI stdout
comparison pass. Logs `/tmp/dadeto-qoi0-{impact-final,static-final,build,mutation-final,final-focused}.log`.
The remaining direct built-in census is 9 modules / 21 imports. Exact pushed
Full Check remains a separate acceptance requirement; parent Rank 11 is Partial.
