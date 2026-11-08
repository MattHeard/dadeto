# Core logic

Trusted, precisely typed domain logic. Preserve legitimate domain/state checks;
internal contract violations propagate to outer error reporting. Inject platform
effects with AllowEffects. Keep untrusted input parsing in the sibling boundary.

Migration is incremental. See [the migration plan](../../../docs/architecture/typed-logic-migration.md).
Legacy `src/core` remains enforced until its modules and consumers move.

The shared local tooling classifier now lives in `local/logic-source-paths.js`.
Its string input and boolean output contract are unchanged; configuration and
quality tooling import this implementation directly, with no legacy forwarder.
