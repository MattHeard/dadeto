# Input handlers relocation

Moved the input handler modules into `src/core/inputHandlers/` and hit missing module errors because a few handlers still referenced browser adapters in `src/browser`. Updating those imports to use `../../browser/...` resolved the runtime issues and unblocked the test suite.
