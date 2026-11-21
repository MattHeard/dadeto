# Static JSONL native baseline

Owning bead: dadeto-hk0y. The full rank-11 migration remains incomplete.

The three actual legacy modules are frozen, including their import graph, in
`test/fixtures/typed-logic/static-jsonl-legacy-source.json` from commit
`d0f14dbe198090f3e98a36a674a4d7250a7e52a3`. Each embedded source has a SHA256
verified before importing it. Production implementations are never substituted
into the original graph.

Run `node test/fixtures/typed-logic/static-jsonl-build-equivalence.js`.
It compares current exports against the frozen original and independently checks
the pinned original observation digest. The initial ledger covers 900 comparator
cases and 100 factory/parser/render cases, including ordinary/new construction,
factory reuse, source capability order, wrapped versus unwrapped errors, column
aliasing, stable ties, physical JSONL line errors, escaping, sparse columns and
prototype keys. Digest:
`9733ec1b5658d693cb996113c93e12d1652a568fd09aad219408f783aa86d3da`.
The `--write-legacy` option records original observations only after current/original
equality; do not regenerate the original ledger to accommodate a refactor.

Unexpected hurdle: the declared scalar projection type is too narrow for the
actual `__proto__` column behavior. Assignment to the ordinary projected object
ignores a scalar `__proto__` value. Slot access then yields `Object.prototype`,
markup contains `[object Object]`, and JSON serialization omits that property.
The baseline records own keys, slot identity, full markup and parsed outcomes.
Changing to a null-prototype projection would change external behavior.

The build and browser acceptance policies differ. Build validation rereads raw
entry properties and keeps the columns array alias. Browser initialization trusts
parsed JSON without schema validation, computes rows before replacing the body,
and updates indicators afterward; click callbacks read button data at click time.
The browser baseline now exercises 45 independent scenarios and 271 snapshots,
including real click dispatch, late dataset reads, malformed payloads, missing
nodes, repeated/new initialization, multiple tables and injected DOM failures.
Run `node test/fixtures/typed-logic/static-jsonl-browser-equivalence.js`.
Original observation SHA256:
`09db175099a84e3206695dc4f17bf5169b85ef077cca3983ca7d57e905441a8c`.

Run `node test/fixtures/typed-logic/static-jsonl-getter-equivalence.js` for 768
ordered getter/failure cases and 13,027 property reads. It includes failures at
each read position, changing descriptor/options values, capability receiver
identity and wrapped-cause identity. Original observation SHA256:
`b05fb37d8ebca2ba278fc09dd5ac4db87d7add6a91c92bc8ec48cd3b2359cd39`.
The older 900/100 ledger remains unchanged. A shared source-graph loader verifies
each embedded module hash before relinking relative imports; native module
implementations remain intact. `test/core/staticJsonlNativeContracts.test.js`
runs all three CLIs as part of the ordinary Jest suite with positive corpus-count
assertions and explicit child failure handling.

These baselines pin observed behavior before extraction. They do not prove
exhaustive acceptance, 100% logic coverage, mutation success or migration
completion. The next implementation must put raw interpretation in total pure
boundary parsers, trusted comparison/sorting/render projection in typed core,
and keep source/DOM capabilities in thin adapters while retaining the recorded
failure/effect sequence. Do not move platform capabilities into logic merely to
make an existing baseline pass.

Keep one complete mutation worker on this host. The existing heat-pump evaluator
runs independently; do not launch a second full mutation process for this bead.

## First production boundary step

The build reader now calls `parseStaticJsonlLine` for its existing per-line guard
group. It rethrows captured failures unchanged and keeps all source/columns reads
at their original positions. Accepted record fields remain unknown until scalar
cell interpretation; a record containing an overflowing JSON number is accepted
by this stage and is rejected later by the existing cell policy.

Focused tests: 72 tests in five suites; new parser lines/statements/functions/
branches all 100%. `types/static-jsonl-line.contract.ts` has five actual negative
controls. Removing their annotations yields exactly TS2554, TS2345, TS2339 twice
and TS2322, with no unrelated errors. The first type run correctly rejected a
missing index-signature annotation on the accepted object; the assertion now
lives after the actual non-null/object/non-array check in the boundary.

Run the complete retained domain scope with
`DADETO_STRYKER_MAX_TEST_RUNNER_REUSE=10 node --experimental-vm-modules node_modules/.bin/stryker run docs/quality/static-jsonl-table.stryker.config.mjs`
when the existing full worker has finished. It retains all three original domain
modules, all six extracted boundary/core modules and shared outcome capture, with static mutants
included, one worker and 100 thresholds. This run is queued, not passed.


## Scalar and HTML escaping step

The actual own-key/finite-number/string cell policy is now a total boundary
parser. Plain-object projection stays in its original place, preserving the
reserved `__proto__` behavior. Native String conversion is a separate total
boundary operation. Both HTML escaping algorithms now live in trusted core with
string-only actual function contracts and no redundant input guards. Existing
attribute/text interpolation and coercion order are unchanged.

All four extracted modules have 100% lines, statements, functions and branches
in `reports/coverage/static-jsonl-scalars/coverage-summary.json`. The focused
run passes 121 tests in eight suites, including the three independent original
ledgers. The actual function type fixture now has ten negative controls; its
unsuppressed probe is `reports/static-jsonl-scalars-negative-types.log`.

The retained domain mutation configuration now includes eight files and keeps all
three original source modules. It remains queued behind the sole existing full
worker. No full mutation result is claimed. Descriptor validation, sorting,
render assembly and source/DOM integration still need the remaining migration.


## Descriptor interpretation step

Structural descriptor acceptance and source confinement now live in total
boundary parsers. Accepted descriptor evidence retains the original reference
with unknown slots: repeated getters can still change source/columns, so success
must not be advertised as stable string/array field evidence. Fourteen actual
negative controls now enforce this distinction alongside the scalar/text rules.

An important integration detail is the order of the absolute-path decision:
`dependencies.paths.isAbsolute(entry.source)` first resolves the path receiver
and method, then reads source, then calls the method with its original receiver.
Passing a pre-read source to an adapter would change that order. The adapter
therefore passes the complete original pure decision as a closure; the boundary
performs the subsequent source-segment check only if that result is falsey.
Boundary code imports no platform module or source reader.

All original native ledgers remain unchanged. The focused suite now passes 165
tests in nine suites, and all four metrics are 100% across five extracted modules.
Reports: `reports/static-jsonl-definition-tests.log`,
`reports/coverage/static-jsonl-definition/coverage-summary.json`, and
`reports/static-jsonl-definition-negative-types.log`. The retained mutation scope
now has nine modules, including every original domain module, with no static
exclusions or lower thresholds. It is queued, not accepted. Sorting, rendering
assembly and source/DOM integration remain outstanding.


## Trusted markup step

Actual header/cell/row/table markup and authored expansion-state computation now
live in `src/logic/core/static-jsonl-table/markup.js`. The integration prepares
all four independently escaped header slots in the original order. It keeps
native map/join operations and computes expansion state before header evaluation,
so no raw coercion/getter is moved across a previous failure point. Core functions
accept precisely named prepared string slots and the exact two expansion
fragments, with no repeated raw-value guards.

The three original behavior ledgers remain unchanged. Focused validation passes
170 tests in ten suites with all four metrics at 100% across six extracted
modules. Reports use the `reports/static-jsonl-markup-` prefix and
`reports/coverage/static-jsonl-markup/`. The actual type fixture has nineteen
negative controls. The mutation configuration retains all three original modules,
all six extracted modules and shared capture, ten files total; it is queued, not
passed. Sorting and source/DOM integration still require migration.

Type-fixture hurdle: Prettier expanded a negative object argument, so a directive
before the call no longer suppressed the error on its `open` property. The normal
type gate and the independent unsuppressed probe both rejected this. Keep the
expected-error marker directly above the invalid property. After that correction,
all nineteen expected diagnostics occur only in the unsuppressed probe, and the
normal eleven-gate check passes. Do not count a probe as valid if the ordinary
fixture contributes unrelated diagnostics.
