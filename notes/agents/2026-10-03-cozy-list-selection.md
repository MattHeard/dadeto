# Cozy saved-list selection

The strict report paired the saved-list guard/return tail with workflow collection.
The local helper now delegates truthy selection and fresh empty fallback to when.
Boolean(items) makes the original truthiness contract explicit for the type gate.
Do not replace this with array validation: truthy legacy non-array values were
previously returned unchanged, and new tests intentionally retain that behavior.

Evidence: `.tmp/cozy-list-tests.log`, 16 tests, exact 100% owner coverage including
truthy identity, every falsy category and independent fallback arrays. Corrected
`.tmp/cozy-list-static.log`: duplication only, 56 to 55 strict clones. Build:
`.tmp/cozy-list-build.log`, passed. Threshold and ignores unchanged; aaou open.
