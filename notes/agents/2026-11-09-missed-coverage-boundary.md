# Missed-coverage interpretation boundary

Owner: dadeto-je16; follows merged coverage folding PR #2824.

Before source edits, run `node test/fixtures/typed-logic/missed-coverage-equivalence.js`.
The harness loads the actual immutable full legacy module at bd05ee9acb946e77b1f0a338295a0dbb9a82e809
(source SHA256 ff612b63219d311046f734737be5809480ddd6162335c830d6a2f6cff36424df)
using AST import rewrites, exposing its private interpreters and complete report.
It compares 1,073 interpretations, 1,073 whole reports, 32 original getter failures
and 576 public CLI outcomes. Receipt: /tmp/dadeto-je16-missed-baseline.json.
Interpretation hash: d1baffadf52957d32d6801a924ad024ced783c33a2b1cefa41e8e920d1da8d88.
Report hash: 6e7d10a5da36d0068c128ff8b34a0d323fc93c866fbf41609fabacb01cf6d21b.
CLI hash: 72f6640da5873ce183e784f9a341fe66718b786428eff73e48c98d48f7c8c6e5.
A second native process produces the identical receipt.

The semantic encoder is shared with coverage-fold-equivalence; extraction leaves
that earlier corpus report byte-identical. It retains object key order, numeric
specials, array holes and graph aliases. Opaque input candidates receive stable
fixture labels; only observed outputs are encoded. Avoid V8 serialization as an
equality fingerprint: equal values need not have identical serialized bytes.

Important original semantics: count must equal numeric zero; lines use
Number.isInteger without a positive/safe range restriction; statement results
sort numerically and deduplicate; branch arms retain native order and one-based
indices, skipping sparse holes. Per-arm line fallback is nullish, not invalid-line
fallback. Read statement locations before counters, then branch locations before
arms; preserve original thrown values and read order. Falsey missing records are
reported uncollected by the composition, distinct from calling private helpers.

Initial fixture lint reported three prefer-template warnings; ESLint's bounded
fix repaired them and the repeated native receipt stayed identical. Fetching main
succeeded, but rebase correctly refused these uncommitted fixture edits; commit
this baseline before advancing the branch onto accepted main.

This characterization does not validate the complete raw JSON schema or repair
prototype-named counter addition (dadeto-ef2o). The architecture spec remains partial.

The actual two private helper bodies now live in
src/logic/boundary/local/missed-coverage.js. The legacy per-file projection unwraps
its explicit result and rethrows the exact error. No source coercion or fallback
rule changed. A named typed evidence value avoids a small result-construction
clone with the existing WGS84 parser; no suppression was added.

Focused ESM Jest passes four suites / 829 tests, with all four metrics 100% for
both changed modules: reports/coverage/missed-coverage/coverage-summary.json,
/tmp/dadeto-je16-focused-repaired.log. Initial test setup omitted
NODE_OPTIONS=--experimental-vm-modules; use that setting for direct Jest calls.
A test initially expected Set to preserve -0, whereas the immutable behavior
canonicalizes it to +0; correct the expectation, not runtime code. A malformed-arm
integration test now proves the effect composition rethrows the original error.
Build, cloud packaging and cloud imports pass (27 packages, 711 modules, 1231
imports), logs /tmp/dadeto-je16-{site-build,cloud-build,cloud-imports}.log.
The expanded eleven-module mutation evaluator retains every prior module, threshold
100 and static evaluation, adding the new complete boundary and its direct tests.
Full mutation and authoritative CI remain mandatory before acceptance.

The second clone report identified the actual repeated success/error constructor
shared with checkFullReport. Both local parsers now use evidence-result.js, with
no input reads moved outside capture. The complete eleven-module mutation scope
includes that helper. All eleven aggregate gates pass in
/tmp/dadeto-je16-shared-result-check.log; duplication reports zero clones and audit
reports zero vulnerabilities. Final focused six suites / 1,686 tests pass with all
four metrics100 across all four changed modules, including the existing report
boundary and shared helper: /tmp/dadeto-je16-shared-result-tests-final.log.
The actual legacy-json compatibility suite is checkFullReport.legacy-json.test.js;
do not guess a new filename when constructing explicit Jest arguments.
