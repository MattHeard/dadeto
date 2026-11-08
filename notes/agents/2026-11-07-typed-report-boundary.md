# Typed report evidence and trusted reporting

Owning bead: `dadeto-6jvu`; related deletion/impact quality owner `dadeto-0nth`.
Actual source is `src/logic/boundary/local/checkFullReport.js` and
`src/logic/core/local/checkFullReport.js`; the former legacy source is absent,
with no forwarding file. The existing thin local adapter reads files/process
metadata, composes the real parser and core APIs, writes artifacts, and propagates
explicit parsing failures. Trusted core never imports boundary or platform APIs.

The boundary accepts untrusted JSON text and failure-log text. Invalid/unreadable
JSON retains the former null-evidence default. Valid JSON with malformed coverage
shape remains an error; the parser returns a failure and the adapter propagates
the original class/message. Runner presence retains original truthiness semantics
even when counts are unavailable. Metric/count parsing never coerces strings or
booleans to numbers. Finite out-of-range values remain domain data. Failure-reason
conversion is skipped when coverage exists, preserving the original lazy path.

Count states correlate unknown suites and tests. Evidence correlates available
coverage with absent failure interpretation; report coverage availability narrows
its measured values without a NonNullable assertion. Core APIs require explicit
normalized inputs. Coverage evaluation and report composition are separate domain
stages, preserving public JSON field order while respecting the effective arity
limit. Do not replace decomposition with a larger transport bag.

Checked assertions have local proofs: Object boxes every JSON candidate to an
unknown-valued object; Number.isFinite proves numeric values; metric projection
constructs every fixed schema key. The four unchecked count casts and the core
nullable-coverage cast are gone. Do not reintroduce raw validation into core.

The actual parse policy initially rejected nullable-state formatting and boundary
property/fromEntries projections as validators. New internal value-return evidence
distinguishes those computations from boolean predicates. Only nullable checks in
value-producing core functions gain that distinction; type inspection, raw parsing
and boolean-only validators retain negative fixtures. This remains a syntactic
policy, not proof that a guard is redundant or a parser total. Preserve meaningful
state decisions and trace typed callers. Legacy classifier labels and CLI JSON
stay unchanged; the extra evidence is consumed by the internal policy only.

Independent pre-migration oracles retain all 117 existing report outputs and now
784 raw JSON outcomes, including outward errors. Every old/new raw result matched
before hashes were saved. New fixture SHA-256:
`ed100fa516ec0f52cb30062280279f1b45c2f75a32173bccd833c160bd5e6eb7`.
`test/fixtures/typed-logic/report-json-contract.js` defines those inputs; the
fixture baseline is `4dffaf1c0028eddaae46e59a96691a3e85bdb205`. Reproduce from
that original implementation; never regenerate expectations from a failing current
implementation. Real CLI fixtures separately prove invalid JSON versus invalid
shape behavior. Compiler fixtures import the actual modules and reject incomplete
thresholds, uncorrelated count/coverage states and missing normalized evidence.

Full-source report mutation configuration is
`docs/quality/typed-report.stryker.config.mjs`; changed-policy mutation uses
`docs/quality/logic-parse-roots.stryker.config.mjs`. Both retain 100% thresholds
and static evaluation. Initial functional success is not mutation/CI acceptance.
Retain executed commands, terminal outcomes and artifact paths in the owning bead.
The unrelated complete impact-consumer survivors remain with `dadeto-0nth`.
