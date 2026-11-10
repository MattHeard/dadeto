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
The browser source is frozen, but native DOM outcomes and descriptor getter/error
traces still need independent characterization before the production extraction.
This initial build/comparator baseline does not establish exhaustive acceptance,
100% coverage, mutation success or completion of the migration.

Keep one complete mutation worker on this host. The existing heat-pump evaluator
runs independently; do not launch a second full mutation process for this bead.
