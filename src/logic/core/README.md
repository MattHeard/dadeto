# Core logic

Trusted, precisely typed domain logic. Preserve legitimate domain/state checks;
internal contract violations propagate to outer error reporting. Inject platform
effects with AllowEffects. Keep untrusted input parsing in the sibling boundary.

Migration is incremental. See [the migration plan](../../../docs/architecture/typed-logic-migration.md).
Legacy `src/core` remains enforced until its modules and consumers move.

The shared local tooling classifier now lives in `local/logic-source-paths.js`.
Its string input and boolean output contract are unchanged; configuration and
quality tooling import this implementation directly, with no legacy forwarder.

`local/checkFullReport.js` consumes normalized report evidence, evaluates coverage
policy and renders the public report. Count and coverage availability types
express correlated states. The adapter composes this module with its sibling
boundary parser; trusted core never imports boundary or silently repairs bad
internal contracts. Coverage evaluation must use the same evidence supplied to
report composition.
