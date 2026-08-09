# Browser moderate coverage

- Unexpected hurdle: the dedicated coverage suite failed during module loading because a Jest mock factory assigned to a lexical binding before initialization.
- Diagnosis: `createLoadStaticConfig` captures and assigns `mockLoadDeps` while Jest hoists the mock factory ahead of the `let` declarations.
- Fix: changed the captured test mock bindings to hoist-safe `var` declarations; the existing two tests then covered the module completely.
- Next-time guidance: inspect mock-factory initialization errors before adding behavioral tests; the failure can prevent all coverage instrumentation from executing.

## Follow-up verification

- Converted the stale CommonJS `jest.mock` calls in `test/core/browser/moderate.coverage.test.js` to native ESM `jest.unstable_mockModule` calls with a dynamic import.
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/browser/moderate.coverage.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/browser/moderate.js' --coverageReporters=text-summary` — 1 suite, 2 tests passed; statements 195/195, branches 69/69, functions 50/50, lines 177/177.
