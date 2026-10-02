# Strict assignment adapter construction

`validatedAssignments.js` owns strict assignment toy construction and its
shared imports. Asset, runner and atomic custodian calculations remain separate
strategies. The factory forwards storage to the atomic strategy and preserves
the original caller-specific rejection serializer. Public module paths and
exported toy names remain compatibility re-exports.

All 134 toy suites / 1,218 tests pass, including strict validation-order and
atomic persistence regressions. The new module has exact 100% statements,
branches, functions and lines coverage (`.tmp/validated-adapters-tests.log`,
`.tmp/validated-adapters-coverage`). Static aggregate passes nine gates;
duplication alone fails at 123 clones, reduced from 125
(`.tmp/validated-adapters-static.log`). minTokens remains 14 with no exceptions,
exemptions or ignore pragmas introduced.
