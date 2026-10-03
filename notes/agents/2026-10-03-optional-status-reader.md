# Optional Symphony status-store reader

The repeated guarded-null return now delegates to canonical `whenOrNull`.
Keep the wrapper async: successful promises must be assimilated and rejection
identity must survive. The selected method remains a property call, retaining its
receiver and the original guard-read plus invocation-read of accessor methods.

`.tmp/optional-status-tests.log`: 33 passing tests, exact 100% bootstrap coverage.
`.tmp/optional-status-static.log`: duplication is the sole failed gate, 72 to 71
strict clones. `.tmp/optional-status-build.log`: successful browser packaging.
The current threshold and exclusion configuration are unchanged.
