# Boundary logic

Pure total parsers for untrusted input. Define typed input/outcomes and explicit
acceptance, coercion, defaults and errors. Inject parsing dependencies from the
platform boundary; do not import runtime frameworks or perform platform effects.

Migration is incremental. See [the migration plan](../../../docs/architecture/typed-logic-migration.md).
Legacy `src/core` remains enforced until its modules and consumers move.

Current examples are `local/git-changes.js` (complete/rejected NUL-delimited Git
status evidence) and `local/checkFullReport.js` (raw JSON/log evidence). Both
produce explicit typed outcomes. Report JSON syntax failure retains the existing
unavailable-evidence default; invalid coverage shape is an explicit failure for
the outer adapter to propagate. Do not move that interpretation into trusted
formatting or hide errors in new successful defaults.
