# Conditional assignment commit envelope

Asset and runner writers now share field coercion, feasibility rejection and
append envelope construction. Metadata is deferred until feasibility succeeds,
so malformed candidate data does not mask ordinary world-line rejection.
The common evaluator adapter retains strategy-specific points defaults: assets
use an empty fallback; runners retain their original required points collection.

The initial six-argument commit helper violated max-params and retained 129
clones. Tightened its contract to one assignment-options object and centralized
the repeated world-line adapter. Final static aggregate passes nine gates;
duplication alone fails with 128 clones, down from 129, with minTokens 14 unchanged
(`.tmp/conditional-commit-final-static.log`). No suppression was introduced.

All 134 toy suites / 1,218 tests pass and the changed module has exact 100%
statements/branches/functions/lines coverage
(`.tmp/conditional-commit-final-tests.log`, `.tmp/conditional-commit-coverage`).
