# Render-variant run coverage

- Hurdle: the existing test used ESM-only `unstable_mockModule`, while the repository Jest transform loads the adapter through CommonJS and reached the renderer's `import.meta.url` syntax.
- Diagnosis: the adapter's dependency contracts were already represented by the test; only the mock mechanism was incompatible with the active runner.
- Fix: convert the dependency mocks to hoisted `jest.mock` factories and use mock-prefixed bindings, preserving the existing behavior assertions.
- Guidance: when a focused adapter test fails before import because a renderer contains `import.meta`, prefer a static boundary mock rather than excluding the adapter from coverage.
