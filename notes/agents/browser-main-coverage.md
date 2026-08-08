# Browser main coverage

- Unexpected hurdle: the focused coverage suite failed before running because Jest hoisted its mock factories ahead of `let` mock initialization.
- Diagnosis: each factory assigned to a lexical mock binding during module loading, producing a temporal-dead-zone error.
- Fix: changed the test fixture bindings to `var`, which permits the hoisted factories to initialize the mocks before the test module continues.
- Next-time guidance: when Jest mock factories intentionally capture assignment targets, use hoist-safe bindings and verify the suite reaches the coverage report.
