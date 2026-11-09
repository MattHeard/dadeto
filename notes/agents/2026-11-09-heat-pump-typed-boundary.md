# Heat-pump screening migration baseline

Owner dadeto-2jg7. This is an architecture follow-up to completed feature2j89 and
presenterm5lz, not a new calculator feature or input/formula policy change. No
production screening code has moved in this baseline.

The actual seven-module graph is pinned at
2cc92b7de42169220d53cc453f8f87657c5c6d91, with a SHA256 for every source in
heat-pump-equivalence.js and heat-pump-legacy-contracts.json. It includes arithmetic,
public composition, validation/comparison/feasibility/thresholds, and pure frozen
preset/portable-export construction. The444line page is a separate DOM/presentation
surface: preserve its contracts and track remaining pure presentation work rather
than claiming the entire feature already migrated.

Run `node test/fixtures/typed-logic/heat-pump-equivalence.js`.
It loads original source through Git and current source through the filesystem,
rewriting actual recursive relative imports to native module data URLs. No formula
or validation body is copied. The expected original graph contains exactlyseven
modules, graphhash347098f878c945b09329c70dd36c35c79268ac2decfaef20dc460e658aa32459.

Independent processes and strict set-e pin/regeneration produce identical receipts:
/tmp/dadeto-2jg7-heat-pump-{baseline,repeat,pinned,strict-repeat}.json.
-613calculator cases, including the three presets: hash
a0f7508f128b2a83d99c0870e144dc386d328ef1cc6427f504377882e837ce73.
-96exact input getter failures and complete repeated property-read trace; tracehash
c7d7c976b9c01b4733f5d8668e96b01d6571be842888f02b400c893cd9337c74.
- Frozen outer/preset/input records, preset hash
719dd719afcf532238897782940d1ce8a2befe654825d0d3ceb986d51ae86395.
-19portable export outcomes, alias identity and32exact getter failures: hash
e30cd1997b3aa5e12fdaa8e289335f785b702b79045f43a1c3b9719aed12c686.
Original-only per-case hashes are retained for later differential Jest, generated
with --write-legacy only after original/current equality and pinned receipt checks.

Critical domain evidence: all inputs may be finite while output arithmetic can
overflow, so preserve the existing calculation-not-finite result. Conversely,
zero-savings/zero-installed-cost produces an internal NaN payback that the public
not-applicable state intentionally omits. A tiny positive target duration produces
internal negative-Infinity allowed cost while the public result remains valid.
Do not reject every non-finite intermediate. Preserve the exact public comparison
check and meaningful available/not-applicable/not-achievable domain decisions.

Retain missing versus own-undefined diagnostics, rule order, no numeric-string
coercion, inclusive/exclusive bounds, non-enumerable own fields, accepted object
prototypes, rejected arrays, unknown ignored fields, function name/arity, caller
aliases and getter failures/read order. Do not impose plain-object constructors or
snapshot properties if that changes observable reads. Localized checked casts need
actual field/rule proof; replace broad any with precise input/result/state types.

Before a move, trace source and published browser exports/imports plus site/cloud
copy contracts. Existing WGS84 build-output compatibility is a model; do not leave
permanent source forwarding trees. Shared asset projection changes require the
previous complete WGS84 mutation scope. Keep the existing presenter/preset/export
and toy documentation contracts covered; no local Playwright execution.

Baseline npm run check -- --skip-tests passes all11gates, zero clones and audit0;
/tmp/dadeto-2jg7-baseline-check.log. Cold lint took175s. Runtime/typing/packaging and
whole-domain/static mutation, exactCI and post-main acceptance still follow.


## Actual arithmetic contracts, before relocation

The first production step applies named twelve-field `HeatPumpAssumptions` and
fourteen-field `HeatPumpValues` contracts to the actual legacy arithmetic function.
The coherent domain module is
`src/logic/core/industrial-heat-pump/industrial-heat-pump.js`; its public comparison
contracts describe existing payback/threshold/status unions for the forthcoming
move. Those public unions are not yet applied to the browser pipeline. This step
does not claim that parsing or scenario computation has moved.

The hurdle was the old `Record<string, number>` signature: it accepted incomplete
records and described raw arithmetic and public states too loosely. The new
`types/industrial-heat-pump.contract.ts` is included in `tsdoc:check`, so the actual
function rejects sparse assumptions and numeric strings. Removing its six
`@ts-expect-error` controls independently produced one TS2345, one TS2322 and four
TS2339 diagnostics: missing assumptions, string COP, public feasibility on raw
values, years on inapplicable payback, value on unachievable thresholds, and a
comparison on invalid results. Keep those controls against actual functions as
the remaining composition moves. No finite-number brand is claimed for raw
intermediate arithmetic.

Validation: `npm run tsdoc:check` passed; focused calculator/page Jest passed
59 tests, repeated with all four arithmetic coverage metrics at 100%
(`reports/coverage/heat-pump-contract/coverage-summary.json`). The native immutable
seven-module harness still matches its original receipt byte-for-byte
(`/tmp/dadeto-2jg7-typed-contract-equivalence.json`).
`npm run check -- --skip-tests` passed all eleven gates after the focused tests
(`/tmp/dadeto-2jg7-contract-check.log`), including zero clones and audit zero.
No runtime body changed, so a fresh mutation run for this declaration-only step
would add no behavioral evidence. Whole-domain mutation remains required after
relocation. Exact full CI and source/asset migration are still pending.
