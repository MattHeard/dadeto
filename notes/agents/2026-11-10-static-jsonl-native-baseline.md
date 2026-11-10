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
modules plus the new parser and shared outcome capture, with static mutants
included, one worker and 100 thresholds. This run is queued, not passed.
