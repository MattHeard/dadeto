# Parser policy across logic namespaces

Owning bead: `dadeto-qtxd`; canonical source is the active
[typed-logic spec](https://app.notion.com/p/3ff700afc301811ab16fcfab82168d28).

The old parse gates scanned only `src/core`. Their integration-directory and
index/main exemptions would also hide trusted computation after a move into
similarly named destination subdirectories. Nineteen real-filesystem/classifier
fixtures first produced sixteen failures demonstrating missed roots and
unobserved directory/source-read failures.

Default scans now use the shared three-root list. An explicit `sourceRoot`,
including an empty string, still selects exactly one required root. Only an
ENOENT when listing an optional future root is benign. Permission failures,
non-directory roots, nested disappearance and source-read errors propagate.
The legacy exemption map and integration-path behavior are preserved.

Destination namespaces have different policies. Boundary allows parsers but
rejects validator-only helpers; trusted core rejects raw interpretation and
validation even when the file is named index/main or is under browser/cloud/
local/scripts/build. Legacy generic AST labels remain unchanged.

The first focused run exposed a false positive: the generic classifier labels
ordinary domain comparisons as validation and object/array construction,
conditional returns and map transformations as parsing. Those labels are an
inventory heuristic, not proof of an untrusted input. Destination policies use
the actual signal kinds instead. Preserve comparisons and construction; detect
primitive/date/JSON interpretation and validation signals. Runtime typeof
comparison has its own signal kind. Collect every distinct kind per label, not
just the first: a domain signal must not hide later parsing or a type guard.
The narrow collection/operand logic lives in a typed portable helper with its
own exhaustive tests, rather than adding more untyped logic to the CLI.

These are syntactic guardrails. They do not establish that an arbitrary guard
is redundant or that a parser is total. Trace precise contracts and typed
callers before removing a runtime guard; retain legitimate domain decisions.
No source has moved in this slice. Thin-wrapper preparation remains necessary
before the first move, and the parent architecture stays incomplete.

## Evidence and reproduction

- Initial regression: `/tmp/dadeto-qtxd-red.log`, sixteen failed / three passed.
- Refined five-suite regression: `/tmp/dadeto-qtxd-final-focused.log`, 76 tests
  pass, statements/branches/functions/lines 100% for both changed core modules.
- Full mutation evaluator (including static mutants, threshold 100%):
  `node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/logic-parse-roots.stryker.config.mjs`.
  Report: `reports/mutation/logic-parse-roots.json`. Inspect its terminal status
  and embedded sources before claiming acceptance.
- The first static run found two dependency-contract mistakes: a directory-only
  adapter was unnecessarily required to include a reader, and narrowing an
  optional signal property did not narrow its enclosing object. Use `Pick` for
  the minimal directory port and pass the narrowed signal array explicitly.
  No unchecked assertion or compiler suppression is needed.

Final static, aggregate, mutation and authoritative CI outcomes belong in the
bead and PR. A passing focused run alone does not close this work.
