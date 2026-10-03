# Cozy saved-list selection

The strict report paired the saved-list guard/return tail with workflow collection.
The local helper now delegates truthy selection and fresh empty fallback to whenOrDefault.
Boolean(items) makes the original truthiness contract explicit for the type gate.
Do not replace this with array validation: truthy legacy non-array values were
previously returned unchanged, and new tests intentionally retain that behavior.

Evidence: `.tmp/cozy-list-tests.log`, 16 tests, exact 100% owner coverage including
truthy identity, every falsy category and independent fallback arrays. Corrected
The first type-correct callback fallback left 56 clones by creating a new tail
match; the earlier 55 count was from the type-invalid intermediate run, not final
acceptance. Re-run `.tmp/cozy-list-static.log` after the value-fallback refinement.
Build:
`.tmp/cozy-list-build.log`, passed. Threshold and ignores unchanged; aaou open.

Refined acceptance is now verified: 16 tests with exact 100% owner coverage,
static duplication-only failure at 55 (56 to 55), and a successful build.
