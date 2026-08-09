# moderate browser coverage

- Unexpected hurdle: the coverage suite failed during module initialization because a Jest mock factory assigned to `mockLoadDeps` before its `let` declaration initialized.
- Fix: changed the mock bindings used by hoisted Jest factories to `var`, preserving the test scenarios while removing the temporal-dead-zone failure.
- Evidence: focused Jest passed 2 tests with 100% statements, branches, functions, and lines for `src/core/browser/moderate.js`.
