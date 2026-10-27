# Boundary logic

Pure total parsers for untrusted input. Define typed input/outcomes and explicit
acceptance, coercion, defaults and errors. Inject parsing dependencies from the
platform boundary; do not import runtime frameworks or perform platform effects.

Migration is incremental. See [the migration plan](../../../docs/architecture/typed-logic-migration.md).
Legacy `src/core` remains enforced until its modules and consumers move.
