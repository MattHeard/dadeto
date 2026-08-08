# Browser moderate coverage

- Unexpected hurdle: the dedicated coverage suite failed during module loading because a Jest mock factory assigned to a lexical binding before initialization.
- Diagnosis: `createLoadStaticConfig` captures and assigns `mockLoadDeps` while Jest hoists the mock factory ahead of the `let` declarations.
- Fix: changed the captured test mock bindings to hoist-safe `var` declarations; the existing two tests then covered the module completely.
- Next-time guidance: inspect mock-factory initialization errors before adding behavioral tests; the failure can prevent all coverage instrumentation from executing.
