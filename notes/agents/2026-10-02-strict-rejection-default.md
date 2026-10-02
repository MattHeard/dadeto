# Strict rejection default ownership

Full aggregate at `9bc028dd9f` exposed one missed branch despite passing focused
coverage of the new adapter: `strictAssignmentCore`'s default rejection argument
was never exercised because the factory supplied its own duplicate default.
Global branch coverage was 9786/9787 (99.989%); unit suites passed but the
coverage gate stopped the browser stage (`.tmp/spatial-sku-checkpoint-full.log`).

The factory now forwards an omitted serializer as undefined so the established
strict boundary owns its existing default. Explicit atomic rejection behavior
remains unchanged. This removes redundant policy rather than adding a synthetic
coverage call or exemption.

Acceptance: all 134 toy suites / 1,219 tests pass; strictAssignmentCore and
validatedAssignments both have exact 100% statements/branches/functions/lines
(`.tmp/strict-default-tests.log`, `.tmp/strict-default-coverage`). Static aggregate
passes nine gates and fails only duplication at 122
(`.tmp/strict-default-static.log`). New full aggregate verification is still
required. Include reused dependency modules in focused coverage after extracts.
