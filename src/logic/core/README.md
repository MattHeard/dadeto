# Core logic

Trusted, precisely typed domain logic. Preserve legitimate domain/state checks;
internal contract violations propagate to outer error reporting. Inject platform
effects with AllowEffects. Keep untrusted input parsing in the sibling boundary.

Migration is incremental. See [the migration plan](../../../docs/architecture/typed-logic-migration.md).
Legacy `src/core` remains enforced until its modules and consumers move.
